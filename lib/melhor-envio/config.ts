/**
 * Configuração da integração Melhor Envio (OAuth 2.0 — authorization code).
 *
 * Tudo vem de env vars server-only (NUNCA NEXT_PUBLIC — client_secret e tokens
 * não podem vazar pro client). Se as credenciais não estiverem setadas, o app
 * roda normal e a UI mostra "configure as credenciais" em vez de quebrar.
 *
 * Env vars esperadas (setar na Vercel + .env.local):
 *   MELHOR_ENVIO_CLIENT_ID       — Client-Id do app criado no painel
 *   MELHOR_ENVIO_CLIENT_SECRET   — Client-Secret do app
 *   MELHOR_ENVIO_REDIRECT_URI    — URL exata do callback registrada no app
 *                                  (ex.: https://SEU-DOMINIO/api/melhor-envio/callback)
 *   MELHOR_ENVIO_ENV             — "sandbox" (default) | "production"
 *   MELHOR_ENVIO_CONTACT_EMAIL   — e-mail de contato p/ o header User-Agent
 *                                  (exigido pela API do Melhor Envio)
 */

export type MelhorEnvioAmbiente = "sandbox" | "production";

const BASE_URLS: Record<MelhorEnvioAmbiente, string> = {
  sandbox: "https://sandbox.melhorenvio.com.br",
  production: "https://www.melhorenvio.com.br",
};

// Escopos pedidos no consentimento. Cobrem o épico todo (cotação, checkout,
// geração/impressão de etiqueta, rastreio) pra não precisar reconsentir depois.
const SCOPES = [
  "cart-read",
  "cart-write",
  "companies-read",
  "coupons-read",
  "notifications-read",
  "orders-read",
  "products-read",
  "products-write",
  "purchases-read",
  "shipping-calculate",
  "shipping-cancel",
  "shipping-checkout",
  "shipping-companies",
  "shipping-generate",
  "shipping-preview",
  "shipping-print",
  "shipping-share",
  "shipping-tracking",
  "users-read",
];

export interface MelhorEnvioConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  ambiente: MelhorEnvioAmbiente;
  contactEmail: string;
  baseUrl: string;
  scope: string;
}

/**
 * Lê e valida a config. Retorna null se faltar qualquer credencial essencial
 * (deixa a UI exibir o estado "não configurado" sem quebrar).
 */
export function getMelhorEnvioConfig(): MelhorEnvioConfig | null {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  const redirectUri = process.env.MELHOR_ENVIO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;

  const ambiente: MelhorEnvioAmbiente =
    process.env.MELHOR_ENVIO_ENV === "production" ? "production" : "sandbox";
  const contactEmail = process.env.MELHOR_ENVIO_CONTACT_EMAIL || "contato@halo.app";

  return {
    clientId,
    clientSecret,
    redirectUri,
    ambiente,
    contactEmail,
    baseUrl: BASE_URLS[ambiente],
    scope: SCOPES.join(" "),
  };
}

export function isMelhorEnvioConfigured(): boolean {
  return getMelhorEnvioConfig() !== null;
}

/** User-Agent exigido pela API do Melhor Envio: "App (email-de-contato)". */
export function melhorEnvioUserAgent(cfg: MelhorEnvioConfig): string {
  return `HALO Prospector (${cfg.contactEmail})`;
}

/** Monta a URL de autorização (passo 1 do OAuth). */
export function buildAuthorizeUrl(cfg: MelhorEnvioConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state,
  });
  return `${cfg.baseUrl}/oauth/authorize?${params.toString()}`;
}
