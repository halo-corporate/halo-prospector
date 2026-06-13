import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/melhor-envio/token";
import { meFetch } from "@/lib/melhor-envio/api";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico TEMPORÁRIO da cotação: roda um shipment/calculate com params
 * fixos e devolve o corpo CRU do Melhor Envio + metadados de forma (isArray,
 * tipo, chaves do topo) pra entender o shape exato sem truncar no toast.
 * Protegido pelo middleware de auth. Remover depois de fechar o PR 4b.
 */
export async function GET() {
  const token = await getValidAccessToken();
  if (!token.ok) {
    return NextResponse.json({ step: "token", ok: false, message: token.message });
  }

  const body = {
    from: { postal_code: "01310100" },
    to: { postal_code: "20040002" },
    package: { height: 4, width: 12, length: 17, weight: 0.3 },
    options: { receipt: false, own_hand: false },
  };

  const res = await meFetch<unknown>(
    token.cfg,
    token.accessToken,
    "/api/v2/me/shipment/calculate",
    { method: "POST", body },
  );

  if (!res.ok) {
    return NextResponse.json({ step: "meFetch", ok: false, status: res.status, message: res.message });
  }

  const data = res.data;
  return NextResponse.json({
    step: "ok",
    ok: true,
    is_array: Array.isArray(data),
    typeof_data: typeof data,
    top_level_keys:
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data as Record<string, unknown>)
        : null,
    length: Array.isArray(data) ? data.length : null,
    raw: data,
  });
}
