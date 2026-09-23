/**
 * Rastreio de envios no Melhor Envio (POST /api/v2/me/shipment/tracking).
 * Recebe ids de pedido (melhor_envio_order_id) e devolve status + código de
 * rastreio + URL de acompanhamento. Só consulta — não cobra nem altera nada no
 * lado do Melhor Envio.
 */
import { type MelhorEnvioConfig } from "./config";
import { meFetch } from "./api";
import { type EnvioStatus } from "@/lib/database.types";

export interface RastreioInfo {
  status: string | null; // status cru do Melhor Envio
  codigoRastreio: string | null;
  trackingUrl: string | null;
}

export type ConsultaRastreioResult =
  | { ok: true; porPedido: Record<string, RastreioInfo> }
  | { ok: false; message: string };

interface TrackingItem {
  id?: string;
  status?: string;
  tracking?: string | null;
  melhorenvio_tracking?: string | null;
  self_tracking?: string | null;
}

/**
 * Mapeia o status cru do Melhor Envio pra um EnvioStatus nosso. Só mapeia os
 * estados que representam avanço claro no fluxo; qualquer outro vira null
 * (= "não mexe no status atual"). O caller só AVANÇA, nunca regride.
 */
export function mapMelhorEnvioStatus(raw: string | null): EnvioStatus | null {
  switch ((raw ?? "").toLowerCase()) {
    case "released": // etiqueta gerada/paga
      return "etiquetado";
    case "posted": // postado nos Correios/transportadora
      return "postado";
    case "delivered": // entregue
      return "entregue";
    default:
      return null;
  }
}

/** Rank de progressão — usado pra só avançar o status, nunca regredir. */
export const ENVIO_STATUS_RANK: Record<EnvioStatus, number> = {
  a_despachar: 0,
  embalado: 1,
  etiquetado: 2,
  postado: 3,
  em_transito: 4,
  entregue: 5,
  devolvido: 6,
  extraviado: 6,
};

function normalizeTrackingResponse(
  data: unknown,
): Record<string, TrackingItem> {
  if (!data || typeof data !== "object") return {};
  // A API devolve um mapa { "<orderId>": {...} }.
  return data as Record<string, TrackingItem>;
}

export async function consultarRastreio(
  cfg: MelhorEnvioConfig,
  accessToken: string,
  orderIds: string[],
): Promise<ConsultaRastreioResult> {
  if (orderIds.length === 0) return { ok: true, porPedido: {} };

  const res = await meFetch<unknown>(
    cfg,
    accessToken,
    "/api/v2/me/shipment/tracking",
    { method: "POST", body: { orders: orderIds } },
  );
  if (!res.ok) {
    return { ok: false, message: `Rastreio recusado pelo Melhor Envio: ${res.message}` };
  }

  const mapa = normalizeTrackingResponse(res.data);
  const porPedido: Record<string, RastreioInfo> = {};
  for (const [id, item] of Object.entries(mapa)) {
    if (!item || typeof item !== "object") continue;
    porPedido[id] = {
      status: item.status ?? null,
      codigoRastreio: item.tracking ?? null,
      trackingUrl: item.melhorenvio_tracking ?? item.self_tracking ?? null,
    };
  }
  return { ok: true, porPedido };
}
