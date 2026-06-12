import { createClient } from "@/lib/supabase/server";
import type { MelhorEnvioAmbiente } from "./config";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

/** Estado da conexão exibido na UI — NUNCA expõe os tokens ao client. */
export interface MelhorEnvioConexaoStatus {
  ambiente: MelhorEnvioAmbiente;
  scope: string | null;
  expiresAt: string;
  connectedAt: string;
  expired: boolean;
}

/**
 * Lê o estado da conexão do usuário (sem tokens). Retorna null se não conectado
 * ou se a tabela ainda não existe (migration 0020 pendente).
 */
export async function getMelhorEnvioConexaoStatus(): Promise<MelhorEnvioConexaoStatus | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("melhor_envio_conexao")
    .select("ambiente, scope, expires_at, connected_at")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error("[getMelhorEnvioConexaoStatus]", error);
    return null;
  }
  if (!data) return null;

  return {
    ambiente: data.ambiente,
    scope: data.scope,
    expiresAt: data.expires_at,
    connectedAt: data.connected_at,
    expired: new Date(data.expires_at).getTime() <= Date.now(),
  };
}
