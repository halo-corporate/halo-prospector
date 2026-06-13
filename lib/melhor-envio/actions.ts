"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "./token";
import { calcularFrete, type CotacaoOpcao } from "./shipping";

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
