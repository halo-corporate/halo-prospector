import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  getMelhorEnvioConfig,
} from "@/lib/melhor-envio/config";

export const dynamic = "force-dynamic";

/**
 * Passo 1 do OAuth: redireciona o usuário pro consentimento do Melhor Envio.
 * Gera um `state` anti-CSRF guardado em cookie httpOnly, conferido no callback.
 */
export async function GET(request: Request) {
  const cfg = getMelhorEnvioConfig();
  if (!cfg) {
    return NextResponse.redirect(
      new URL("/envios?me=nao_configurado", request.url),
    );
  }

  const state = randomBytes(16).toString("hex");
  cookies().set("me_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  return NextResponse.redirect(buildAuthorizeUrl(cfg, state));
}
