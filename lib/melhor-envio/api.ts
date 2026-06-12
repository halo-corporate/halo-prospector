/**
 * Cliente HTTP do Melhor Envio — só o que a fatia de CONEXÃO precisa:
 * troca de `code` por tokens e refresh do access_token. Cotação, etiqueta e
 * rastreio entram em fatias futuras reusando `meFetch`.
 */
import {
  type MelhorEnvioConfig,
  melhorEnvioUserAgent,
} from "./config";

export interface MelhorEnvioTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // segundos
  scope?: string;
}

export type TokenResult =
  | { ok: true; data: MelhorEnvioTokenResponse }
  | { ok: false; message: string };

/**
 * Troca o `code` recebido no callback OAuth por access_token + refresh_token.
 */
export async function exchangeCodeForTokens(
  cfg: MelhorEnvioConfig,
  code: string,
): Promise<TokenResult> {
  return postToken(cfg, {
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code,
  });
}

/**
 * Renova o access_token usando o refresh_token (chamado quando expira).
 */
export async function refreshAccessToken(
  cfg: MelhorEnvioConfig,
  refreshToken: string,
): Promise<TokenResult> {
  return postToken(cfg, {
    grant_type: "refresh_token",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: cfg.scope,
    refresh_token: refreshToken,
  });
}

async function postToken(
  cfg: MelhorEnvioConfig,
  body: Record<string, string>,
): Promise<TokenResult> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": melhorEnvioUserAgent(cfg),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, message: `Falha de rede com o Melhor Envio: ${String(e)}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json as { error_description?: string; message?: string } | null)
        ?.error_description ??
      (json as { message?: string } | null)?.message ??
      `HTTP ${res.status}`;
    return { ok: false, message: `Melhor Envio recusou: ${msg}` };
  }

  const data = json as Partial<MelhorEnvioTokenResponse> | null;
  if (!data?.access_token || !data.refresh_token) {
    return { ok: false, message: "Resposta do Melhor Envio sem tokens." };
  }

  return {
    ok: true,
    data: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type ?? "Bearer",
      expires_in: typeof data.expires_in === "number" ? data.expires_in : 0,
      scope: data.scope,
    },
  };
}
