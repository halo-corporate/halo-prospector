"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "./token";
import { calcularFrete, type CotacaoOpcao } from "./shipping";
import { gerarEtiqueta, type EnderecoEtiqueta } from "./etiqueta";
import { getMelhorEnvioRemetente, isRemetenteCompleto } from "./remetente";

export type MelhorEnvioActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type CotacaoFreteResult =
  | { ok: true; opcoes: CotacaoOpcao[] }
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

  const from: EnderecoEtiqueta = {
    name: remetente.nome,
    phone: remetente.telefone ?? undefined,
    email: remetente.email ?? undefined,
    document: onlyDigits(remetente.documento),
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
    document: destinatarioDoc.length > 0 ? destinatarioDoc : undefined,
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
  if (!etiqueta.ok) return { ok: false, message: etiqueta.message };

  // Baixa o PDF e sobe no bucket `etiquetas` (mesmo padrão do upload manual).
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${user.id}/${envioId}-${rand}.pdf`;
  let etiquetaPath: string | null = null;
  try {
    const pdfRes = await fetch(etiqueta.data.pdfUrl);
    if (pdfRes.ok) {
      const bytes = new Uint8Array(await pdfRes.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("etiquetas")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) {
        console.error("[gerarEtiquetaAction upload]", upErr);
      } else {
        etiquetaPath = path;
      }
    } else {
      console.error("[gerarEtiquetaAction pdf fetch]", pdfRes.status);
    }
  } catch (e) {
    console.error("[gerarEtiquetaAction pdf]", e);
  }

  const { error: updErr } = await supabase
    .from("envios")
    .update({
      melhor_envio_order_id: etiqueta.data.orderId,
      etiqueta_url: etiquetaPath,
      codigo_rastreio: etiqueta.data.codigoRastreio,
      tracking_url: etiqueta.data.trackingUrl,
      valor_frete: opcao.valor,
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
  return { ok: true, etiquetaPath: etiquetaPath ?? "", orderId: etiqueta.data.orderId };
}
