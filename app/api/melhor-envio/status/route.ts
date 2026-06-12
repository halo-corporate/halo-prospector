import { NextResponse } from "next/server";
import { getMelhorEnvioConfig } from "@/lib/melhor-envio/config";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico da config Melhor Envio. NÃO expõe os secrets — só booleanos de
 * presença. `redirect_uri` e `env` são não-sensíveis, então retorna o valor
 * pra conferir match exato (barra final, ambiente). Protegido pelo middleware
 * de auth (só o usuário logado acessa).
 */
export async function GET() {
  return NextResponse.json({
    has_client_id: Boolean(process.env.MELHOR_ENVIO_CLIENT_ID),
    has_client_secret: Boolean(process.env.MELHOR_ENVIO_CLIENT_SECRET),
    has_contact_email: Boolean(process.env.MELHOR_ENVIO_CONTACT_EMAIL),
    redirect_uri: process.env.MELHOR_ENVIO_REDIRECT_URI ?? null,
    env: process.env.MELHOR_ENVIO_ENV ?? null,
    configured: getMelhorEnvioConfig() !== null,
  });
}
