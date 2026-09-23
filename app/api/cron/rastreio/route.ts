/**
 * Rota de cron para rastreio de envios via Melhor Envio.
 * Valida CRON_SECRET no header Authorization antes de executar.
 */
import { NextRequest, NextResponse } from "next/server";
import { atualizarRastreios } from "@/lib/melhor-envio/cron";

export async function GET(request: NextRequest) {
  // 1. Valida CRON_SECRET
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[cron/rastreio] CRON_SECRET não configurado");
    return NextResponse.json(
      { error: "Servidor mal configurado: CRON_SECRET ausente" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.warn("[cron/rastreio] Acesso não autorizado");
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Executa o cron
  const result = await atualizarRastreios();

  if (!result.ok) {
    console.error("[cron/rastreio] Erros:", result.erros);
    return NextResponse.json(
      { error: "Cron falhou", details: result.erros },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    contas: result.contas,
    verificados: result.verificados,
    atualizados: result.atualizados,
  });
}
