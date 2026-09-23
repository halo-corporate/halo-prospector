import { createClient } from "@/lib/supabase/server";
import type { MelhorEnvioRemetente } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

/**
 * Dados do remetente do usuário (sem nada secreto — é a identidade comercial
 * dele). Retorna null se não preenchido ou se a tabela ainda não existe
 * (migration 0021 pendente).
 */
export async function getMelhorEnvioRemetente(): Promise<MelhorEnvioRemetente | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("melhor_envio_remetente")
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error("[getMelhorEnvioRemetente]", error);
    return null;
  }
  return data ?? null;
}

/**
 * Mínimo necessário pro checkout do Melhor Envio: nome, documento (CPF/CNPJ) e
 * endereço (CEP + número). Sem isso não dá pra gerar etiqueta.
 */
export function isRemetenteCompleto(
  r: MelhorEnvioRemetente | null,
): r is MelhorEnvioRemetente {
  if (!r) return false;
  const doc = (r.documento ?? "").replace(/\D/g, "");
  const cep = (r.cep ?? "").replace(/\D/g, "");
  return (
    r.nome.trim().length > 0 &&
    (doc.length === 11 || doc.length === 14) &&
    cep.length === 8 &&
    (r.numero ?? "").trim().length > 0
  );
}
