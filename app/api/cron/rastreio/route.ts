import { NextResponse, type NextRequest } from "next/server";
import { atualizarRastreios } from "@/lib/melhor-envio/cron";

export const dynamic = "force-dynamic";
// Sem cache e roda no runtime Node (precisa do service role + fetch externo).
export const runtime = "nodejs";

/**
 * Cron de rastreio (1x/dia, agendado no vercel.json). Atualiza o status dos
 * envios com pedido no Melhor Envio.
 *
 * Proteção: exige `CRON_SECRET`. O Vercel Cron manda automaticamente o header
 * `Authorization: Bearer <CRON_SECRET>` quando a env var existe. Também aceita
 * `?secret=` pra disparo manual de teste. Sem secret configurado → 503 (a
 * feature fica desligada, sem expor a rota).
 */
function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const qs = request.nextUrl.searchParams.get("secret");
  return qs === secret;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (!autorizado(request)) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const result = await atualizarRastreios();
  return NextResponse.json(result, { status: result.ok ? 200 : 207 });
}
