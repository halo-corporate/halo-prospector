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
