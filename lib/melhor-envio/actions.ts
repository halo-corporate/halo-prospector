"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "./token";
import {
  calcularFrete,
  type CotacaoOpcao,
  type CotacaoIndisponivel,
} from "./shipping";
import {
  gerarEtiqueta,
  reimprimirEtiqueta,
  type EnderecoEtiqueta,
} from "./etiqueta";
import { getMelhorEnvioRemetente, isRemetenteCompleto } from "./remetente";

export type MelhorEnvioActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type CotacaoFreteResult =
  | { ok: true; opcoes: CotacaoOpcao[]; indisponiveis: CotacaoIndisponivel[] }
  | { ok: false; message: string };

export interface CotacaoFreteInput {
  fromCep: string;
  toCep: string;
  pesoG: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export interface RemetenteInput {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const trimOrNull = (s: string) => {
  const t = s.trim();
  return t.length > 0 ? t : null;
};

/**
 * Salva (upsert) os dados do remetente do usuário, usados no checkout do Melhor
 * Envio. Valida o mínimo: nome, documento (CPF 11 / CNPJ 14 dígitos), CEP (8) e
 * número. O resto é opcional mas recomendado. Não cobra nada.
 */
export async function saveRemetenteAction(
  input: RemetenteInput,
): Promise<MelhorEnvioActionResult> {
  const nome = input.nome.trim();
  const documento = onlyDigits(input.documento);
  const cep = onlyDigits(input.cep);
  const numero = input.numero.trim();
  const uf = input.uf.trim().toUpperCase();

  if (!nome) return { ok: false, message: "Informe o nome ou razão social do remetente." };
  if (documento.length !== 11 && documento.length !== 14) {
    return { ok: false, message: "Documento inválido: CPF (11) ou CNPJ (14 dígitos)." };
  }
  if (cep.length !== 8) return { ok: false, message: "CEP do remetente inválido (8 dígitos)." };
  if (!numero) return { ok: false, message: "Informe o número do endereço do remetente." };
  if (uf && !/^[A-Z]{2}$/.test(uf)) return { ok: false, message: "UF deve ter 2 letras." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { error } = await supabase.from("melhor_envio_remetente").upsert(
    {
      user_id: user.id,
      nome,
      documento,
      telefone: trimOrNull(input.telefone),
      email: trimOrNull(input.email),
      cep,
      rua: trimOrNull(input.rua),
      numero,
      complemento: trimOrNull(input.complemento),
      bairro: trimOrNull(input.bairro),
      cidade: trimOrNull(input.cidade),
      uf: uf || null,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[saveRemetenteAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true };
}

/**
 * Cota o frete no Melhor Envio para os dados informados no form de envio.
 * Renova o token se preciso. Não persiste nada — quem escolhe a opção preenche
 * o form e salva pelo fluxo normal.
 */
export async function calcularFreteAction(
  input: CotacaoFreteInput,
): Promise<CotacaoFreteResult> {
  const fromCep = onlyDigits(input.fromCep);
  const toCep = onlyDigits(input.toCep);
  if (fromCep.length !== 8) return { ok: false, message: "CEP de origem inválido (8 dígitos)." };
  if (toCep.length !== 8) return { ok: false, message: "CEP de destino inválido (8 dígitos)." };

  const peso = Number(input.pesoG);
  const altura = Number(input.alturaCm);
  const largura = Number(input.larguraCm);
  const comprimento = Number(input.comprimentoCm);
  if (![peso, altura, largura, comprimento].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, message: "Preencha peso e dimensões (altura, largura, comprimento) antes de cotar." };
  }

  const token = await getValidAccessToken();
  if (!token.ok) return { ok: false, message: token.message };

  return calcularFrete(token.cfg, token.accessToken, {
    fromCep,
    toCep,
    pesoG: peso,
    alturaCm: altura,
    larguraCm: largura,
    comprimentoCm: comprimento,
  });
}

/**
 * Desconecta a conta do Melhor Envio: apaga os tokens guardados. (Não revoga no
 * lado do Melhor Envio — só descarta localmente; reconectar pede novo consentimento.)
 */
export async function disconnectMelhorEnvioAction(): Promise<MelhorEnvioActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("melhor_envio_conexao")
    .delete()
    .eq("user_id", user.id);
  if (error) {
    console.error("[disconnectMelhorEnvioAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true };
}

type SupabaseServer = ReturnType<typeof createClient>;

/**
 * Baixa o PDF da etiqueta (URL pública do Melhor Envio) e sobe no bucket
 * `etiquetas`, no mesmo padrão do upload manual: {user_id}/{envio_id}-{rand}.pdf.
 * Manda o Bearer junto (links private exigem sessão; mesmo no public não atrapalha)
 * e valida os magic bytes `%PDF` — se vier HTML (página de login) ou erro, NÃO
 * sobe lixo e devolve o motivo. Best-effort: nunca lança, sempre devolve
 * { path, error } pro caller decidir.
 */
async function baixarEtiquetaPdf(
  supabase: SupabaseServer,
  userId: string,
  envioId: string,
  pdfUrl: string,
  accessToken: string,
): Promise<{ path: string | null; error: string | null }> {
  let bytes: Uint8Array;
  try {
    const resp = await fetch(pdfUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/pdf" },
    });
    if (!resp.ok) {
      return { path: null, error: `download HTTP ${resp.status}` };
    }
    bytes = new Uint8Array(await resp.arrayBuffer());
  } catch (e) {
    return { path: null, error: e instanceof Error ? e.message : "erro de rede no download" };
  }

  // Magic bytes %PDF — se não bater, provavelmente veio HTML (login) ou erro.
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    return { path: null, error: "o arquivo baixado não é um PDF válido (veio HTML/erro?)" };
  }

  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${envioId}-${rand}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("etiquetas")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (upErr) {
    console.error("[baixarEtiquetaPdf upload]", upErr);
    return { path: null, error: upErr.message };
  }
  return { path, error: null };
}

export type GerarEtiquetaActionResult =
  | { ok: true; etiquetaPath: string; orderId: string }
  | { ok: false; message: string };

/**
 * Gera a etiqueta do envio no Melhor Envio. DEBITA o saldo da conta no checkout
 * — por isso o caller só chama depois de confirmação explícita do usuário.
 *
 * Fluxo:
 *  1) Lê o envio e valida que tem destino (CEP+número), peso, dimensões e
 *     serviço escolhido. Recusa se já existe `melhor_envio_order_id` (não
 *     cobra duas vezes).
 *  2) Lê o remetente e exige dados completos (nome, doc, CEP, número).
 *  3) Re-cota o frete pra recuperar o `servicoId` ao vivo (no 4b só guardamos o
 *     NOME do serviço, não o id) casando pelo nome do serviço salvo.
 *  4) Chama gerarEtiqueta (cart→checkout→generate→print).
 *  5) Baixa o PDF e sobe no bucket `etiquetas`, grava order_id/rastreio no envio.
 */
export async function gerarEtiquetaAction(
  envioId: string,
  valorDeclarado: number,
): Promise<GerarEtiquetaActionResult> {
  if (!envioId || envioId.length < 10) {
    return { ok: false, message: "ID do envio inválido." };
  }
  const insurance = Number(valorDeclarado);
  if (!Number.isFinite(insurance) || insurance <= 0) {
    return { ok: false, message: "Informe um valor declarado válido pro seguro." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: envio, error: envioErr } = await supabase
    .from("envios")
    .select("*")
    .eq("id", envioId)
    .maybeSingle();
  if (envioErr) {
    console.error("[gerarEtiquetaAction envio]", envioErr);
    return { ok: false, message: envioErr.message };
  }
  if (!envio) return { ok: false, message: "Envio não encontrado." };

  if (envio.melhor_envio_order_id) {
    return {
      ok: false,
      message: "Este envio já tem etiqueta gerada no Melhor Envio.",
    };
  }
  if (!envio.servico) {
    return { ok: false, message: "Escolha o serviço (cote o frete) antes de gerar a etiqueta." };
  }

  const destino = envio.endereco_destino;
  const destinoCep = onlyDigits(destino?.cep ?? "");
  if (destinoCep.length !== 8 || !(destino?.numero ?? "").trim()) {
    return { ok: false, message: "Endereço de destino incompleto (CEP e número)." };
  }

  // O Melhor Envio exige CPF (11) ou CNPJ (14 díg.) do destinatário no cart.
  // Barra aqui pra não fazer a re-cotação à toa nem chegar ao passo que cobra.
  const destinatarioDocDigits = onlyDigits(envio.destinatario_documento ?? "");
  if (destinatarioDocDigits.length !== 11 && destinatarioDocDigits.length !== 14) {
    return {
      ok: false,
      message:
        "CPF (11) ou CNPJ (14 dígitos) do destinatário é obrigatório pra gerar a etiqueta. Edite o envio e preencha.",
    };
  }

  const peso = Number(envio.peso_g);
  const altura = Number(envio.dimensoes_cm?.altura);
  const largura = Number(envio.dimensoes_cm?.largura);
  const comprimento = Number(envio.dimensoes_cm?.comprimento);
  if (![peso, altura, largura, comprimento].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, message: "Preencha peso e dimensões do envio antes de gerar a etiqueta." };
  }

  const remetente = await getMelhorEnvioRemetente();
  if (!isRemetenteCompleto(remetente)) {
    return {
      ok: false,
      message: "Preencha os dados do remetente (nome, documento, CEP e número) antes de gerar a etiqueta.",
    };
  }
  const remCep = onlyDigits(remetente.cep);

  const token = await getValidAccessToken();
  if (!token.ok) return { ok: false, message: token.message };

  // Re-cota pra recuperar o servicoId ao vivo (4b só guardou o nome do serviço).
  const cotacao = await calcularFrete(token.cfg, token.accessToken, {
    fromCep: remCep,
    toCep: destinoCep,
    pesoG: peso,
    alturaCm: altura,
    larguraCm: largura,
    comprimentoCm: comprimento,
  });
  if (!cotacao.ok) return { ok: false, message: cotacao.message };
  const opcao =
    cotacao.opcoes.find((o) => o.servico === envio.servico) ?? null;
  if (!opcao) {
    return {
      ok: false,
      message: `O serviço "${envio.servico}" não está mais disponível pra esse trajeto. Cote o frete de novo e escolha outro.`,
    };
  }

  // O Melhor Envio valida `document` como CPF (11 díg.) e usa `company_document`
  // pro CNPJ (14 díg.). Roteia conforme o tamanho.
  const remDoc = onlyDigits(remetente.documento);
  const from: EnderecoEtiqueta = {
    name: remetente.nome,
    phone: remetente.telefone ?? undefined,
    email: remetente.email ?? undefined,
    document: remDoc.length === 11 ? remDoc : undefined,
    company_document: remDoc.length === 14 ? remDoc : undefined,
    address: remetente.rua ?? "",
    complement: remetente.complemento ?? undefined,
    number: remetente.numero ?? "",
    district: remetente.bairro ?? undefined,
    city: remetente.cidade ?? undefined,
    state_abbr: remetente.uf ?? undefined,
    postal_code: remCep,
  };
  const destinatarioDoc = onlyDigits(envio.destinatario_documento ?? "");
  const to: EnderecoEtiqueta = {
    name: envio.destinatario_nome,
    phone: envio.destinatario_telefone ?? undefined,
    email: envio.destinatario_email ?? undefined,
    document: destinatarioDoc.length === 11 ? destinatarioDoc : undefined,
    company_document: destinatarioDoc.length === 14 ? destinatarioDoc : undefined,
    address: destino?.rua ?? "",
    complement: destino?.complemento ?? undefined,
    number: (destino?.numero ?? "").trim(),
    district: destino?.bairro ?? undefined,
    city: destino?.cidade ?? undefined,
    state_abbr: destino?.uf ?? undefined,
    postal_code: destinoCep,
  };

  const etiqueta = await gerarEtiqueta(token.cfg, token.accessToken, {
    serviceId: opcao.servicoId,
    from,
    to,
    volume: {
      height: altura,
      width: largura,
      length: comprimento,
      weight: peso / 1000, // API espera kg
    },
    insuranceValue: insurance,
    productName: "Produto HALO",
  });
  if (!etiqueta.ok) {
    // Se o checkout JÁ debitou mas o Melhor Envio falhou depois, grava o
    // order_id mesmo assim pra `jaGerada` bloquear nova compra — senão um novo
    // clique cobraria DE NOVO (foi o que causou a cobrança dupla na validação).
    if (etiqueta.cobrado && etiqueta.orderId) {
      const { error: partialErr } = await supabase
        .from("envios")
        .update({ melhor_envio_order_id: etiqueta.orderId })
        .eq("id", envioId);
      if (partialErr) console.error("[gerarEtiquetaAction partial]", partialErr);
      revalidatePath(`/envios/${envioId}`);
      revalidatePath("/envios");
      return {
        ok: false,
        message: `Etiqueta PAGA (pedido ${etiqueta.orderId}), mas o Melhor Envio falhou ao finalizar: ${etiqueta.message}. NÃO gere de novo (cobraria outra vez) — baixe a etiqueta no painel do Melhor Envio e anexe pelo botão "Enviar PDF".`,
      };
    }
    return { ok: false, message: etiqueta.message };
  }

  // Tenta baixar o PDF binário pro bucket. O Melhor Envio, porém, serve a
  // etiqueta como PÁGINA HTML pública (/imprimir/HASH) — não há PDF binário ali —
  // então o download normalmente não rende um PDF. Nesse caso guardamos o LINK
  // público direto em `etiqueta_url` (o "Abrir / imprimir" abre a etiqueta sem
  // login; o usuário imprime/salva como PDF pelo navegador).
  const { path: etiquetaPath } = await baixarEtiquetaPdf(
    supabase,
    user.id,
    envioId,
    etiqueta.data.pdfUrl,
    token.accessToken,
  );
  const etiquetaRef = etiquetaPath ?? etiqueta.data.pdfUrl;

  // Valor REAL cobrado no checkout (do pedido) — cai pra estimativa da cotação
  // só se a API não devolveu o preço do pedido.
  const valorFrete = etiqueta.data.valorFrete ?? opcao.valor;

  const { error: updErr } = await supabase
    .from("envios")
    .update({
      melhor_envio_order_id: etiqueta.data.orderId,
      etiqueta_url: etiquetaRef,
      codigo_rastreio: etiqueta.data.codigoRastreio,
      tracking_url: etiqueta.data.trackingUrl,
      valor_frete: valorFrete,
    })
    .eq("id", envioId);
  if (updErr) {
    // A etiqueta JÁ foi paga/gerada — não falha o fluxo só por causa do registro
    // local. Loga e segue: o order_id está no Melhor Envio.
    console.error("[gerarEtiquetaAction update]", updErr);
    return {
      ok: false,
      message: `Etiqueta gerada (pedido ${etiqueta.data.orderId}), mas falhou ao salvar no envio: ${updErr.message}`,
    };
  }

  revalidatePath(`/envios/${envioId}`);
  revalidatePath("/envios");

  return { ok: true, etiquetaPath: etiquetaRef, orderId: etiqueta.data.orderId };
}

export type RebaixarEtiquetaActionResult =
  | { ok: true; etiquetaPath: string }
  | { ok: false; message: string };

/**
 * Re-puxa o PDF de uma etiqueta JÁ paga/gerada pro sistema, SEM cobrar de novo.
 * Usa o `melhor_envio_order_id` do envio e só chama `shipment/print` (mode public)
 * — nada de cart/checkout. Serve pra quando a geração cobrou mas o PDF não chegou
 * (ex.: pedido emitido em mode private antes do fix). Recusa se o envio já tem
 * `etiqueta_url` (nada a fazer) ou se não tem order_id (nunca foi gerada).
 */
export async function rebaixarEtiquetaAction(
  envioId: string,
): Promise<RebaixarEtiquetaActionResult> {
  if (!envioId || envioId.length < 10) {
    return { ok: false, message: "ID do envio inválido." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: envio, error: envioErr } = await supabase
    .from("envios")
    .select("id, melhor_envio_order_id, etiqueta_url, codigo_rastreio, tracking_url, valor_frete")
    .eq("id", envioId)
    .maybeSingle();
  if (envioErr) {
    console.error("[rebaixarEtiquetaAction envio]", envioErr);
    return { ok: false, message: envioErr.message };
  }
  if (!envio) return { ok: false, message: "Envio não encontrado." };
  if (envio.etiqueta_url) {
    return { ok: false, message: "Este envio já tem a etiqueta no sistema." };
  }
  if (!envio.melhor_envio_order_id) {
    return {
      ok: false,
      message: "Este envio não tem pedido no Melhor Envio. Gere a etiqueta primeiro.",
    };
  }

  const token = await getValidAccessToken();
  if (!token.ok) return { ok: false, message: token.message };

  const reimp = await reimprimirEtiqueta(
    token.cfg,
    token.accessToken,
    envio.melhor_envio_order_id,
  );
  if (!reimp.ok) return { ok: false, message: reimp.message };

  // Tenta o PDF binário; se não vier (o Melhor Envio serve HTML em /imprimir),
  // guarda o LINK público direto — o "Abrir / imprimir" abre a etiqueta sem login.
  const { path: etiquetaPath } = await baixarEtiquetaPdf(
    supabase,
    user.id,
    envioId,
    reimp.data.pdfUrl,
    token.accessToken,
  );
  const etiquetaRef = etiquetaPath ?? reimp.data.pdfUrl;

  // Preenche também rastreio/tracking/valor se ainda estiverem vazios (best-effort).
  const update: Record<string, unknown> = { etiqueta_url: etiquetaRef };
  if (!envio.codigo_rastreio && reimp.data.codigoRastreio) {
    update.codigo_rastreio = reimp.data.codigoRastreio;
  }
  if (!envio.tracking_url && reimp.data.trackingUrl) {
    update.tracking_url = reimp.data.trackingUrl;
  }
  if (envio.valor_frete == null && reimp.data.valorFrete != null) {
    update.valor_frete = reimp.data.valorFrete;
  }

  const { error: updErr } = await supabase
    .from("envios")
    .update(update)
    .eq("id", envioId);
  if (updErr) {
    // Se subiu PDF binário pro bucket, limpa pra não deixar lixo (link externo
    // não tem o que apagar).
    if (etiquetaPath) {
      await supabase.storage.from("etiquetas").remove([etiquetaPath]);
    }
    console.error("[rebaixarEtiquetaAction update]", updErr);
    return { ok: false, message: updErr.message };
  }

  revalidatePath(`/envios/${envioId}`);
  revalidatePath("/envios");
  return { ok: true, etiquetaPath: etiquetaRef };
}
