// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// Sob SSO o HALO não tem sessão Supabase própria (auth.getUser() retorna null).
// O dono da conexão OAuth vem da constante fixa HALO_USER_ID, não de user.id.
// Nota: com basePath '/halo' o redirect URI deste callback virou
// /halo/api/melhor-envio/callback — atualizar no painel do Melhor Envio num
// reconnect futuro.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, HALO_USER_ID } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/melhor-envio/api";
import { getMelhorEnvioConfig } from "@/lib/melhor-envio/config";

export const dynamic = "force-dynamic";

const back = (request: Request, status: string) =>
  NextResponse.redirect(new URL(`/envios?me=${status}`, request.url));

/**
 * Passo 2 do OAuth: o Melhor Envio redireciona pra cá com `code` + `state`.
 * Confere o state, troca o code por tokens e guarda na melhor_envio_conexao.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Limpa o cookie de state independentemente do desfecho.
  const cookieState = cookies().get("me_oauth_state")?.value;
  cookies().delete("me_oauth_state");

  if (oauthError) return back(request, "erro");
  if (!code || !state) return back(request, "erro");
  if (!cookieState || cookieState !== state) return back(request, "state_invalido");

  const cfg = getMelhorEnvioConfig();
  if (!cfg) return back(request, "nao_configurado");

  const tokens = await exchangeCodeForTokens(cfg, code);
  if (!tokens.ok) {
    console.error("[melhor-envio callback] token exchange:", tokens.message);
    return back(request, "erro");
  }

  const supabase = createClient();

  const expiresAt = new Date(
    Date.now() + tokens.data.expires_in * 1000,
  ).toISOString();

  const { error } = await supabase.from("melhor_envio_conexao").upsert(
    {
      user_id: HALO_USER_ID,
      access_token: tokens.data.access_token,
      refresh_token: tokens.data.refresh_token,
      token_type: tokens.data.token_type,
      scope: tokens.data.scope ?? cfg.scope,
      ambiente: cfg.ambiente,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[melhor-envio callback] upsert:", error);
    return back(request, "erro");
  }

  return back(request, "conectado");
}
