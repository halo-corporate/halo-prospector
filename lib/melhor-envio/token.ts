/**
 * Server-only: obtém um access_token VÁLIDO do Melhor Envio para o usuário
 * logado. Lê a linha em melhor_envio_conexao (RLS owner), e se o token estiver
 * expirado (ou perto disso) renova via refresh_token e grava de volta — o
 * banco continua sendo a fonte de verdade. NUNCA expor o retorno ao client.
 *
 * ATENÇÃO: usa service-role (single-user, HALO_USER_ID fixo). Se o app ganhar
 * multi-user, filtrar por user_id em todas as operações de escrita.
 */
import { createClient } from "@/lib/supabase/server";
import { getMelhorEnvioConfig, type MelhorEnvioConfig } from "./config";
import { refreshAccessToken } from "./api";

// Margem de segurança: renova se faltar menos que isto pra expirar.
const REFRESH_SKEW_MS = 60_000;

/**
 * Identidade fixa do Gabriel no Supabase do HALO (single-user).
 * Usado em todas as operações de escrita que precisam de user_id.
 */
export const HALO_USER_ID = "e7fa0ed0-ae90-4c09-92d8-8ca34fed1f1c";

export type ValidTokenResult =
  | { ok: true; accessToken: string; cfg: MelhorEnvioConfig }
  | { ok: false; message: string };

export async function getValidAccessToken(): Promise<ValidTokenResult> {
  const cfg = getMelhorEnvioConfig();
  if (!cfg) return { ok: false, message: "Melhor Envio não configurado." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("melhor_envio_conexao")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", HALO_USER_ID)
    .maybeSingle();

  if (error) {
    console.error("[getValidAccessToken] select:", error);
    return { ok: false, message: "Não foi possível ler a conexão do Melhor Envio." };
  }
  if (!data) return { ok: false, message: "Conecte sua conta do Melhor Envio primeiro." };

  const expiresMs = new Date(data.expires_at).getTime();
  const stillValid = expiresMs - Date.now() > REFRESH_SKEW_MS;
  if (stillValid) {
    return { ok: true, accessToken: data.access_token, cfg };
  }

  // Expirado/perto de expirar → renova.
  const refreshed = await refreshAccessToken(cfg, data.refresh_token);
  if (!refreshed.ok) {
    return {
      ok: false,
      message: `Sessão do Melhor Envio expirou e não renovou (${refreshed.message}). Reconecte.`,
    };
  }

  const newExpiresAt = new Date(
    Date.now() + refreshed.data.expires_in * 1000,
  ).toISOString();

  const { error: updError } = await supabase
    .from("melhor_envio_conexao")
    .update({
      access_token: refreshed.data.access_token,
      refresh_token: refreshed.data.refresh_token,
      token_type: refreshed.data.token_type,
      scope: refreshed.data.scope ?? cfg.scope,
      expires_at: newExpiresAt,
    })
    .eq("user_id", HALO_USER_ID);

  if (updError) {
    console.error("[getValidAccessToken] update:", updError);
    // Mesmo se a gravação falhar, o token novo é utilizável agora.
  }

  return { ok: true, accessToken: refreshed.data.access_token, cfg };
}
