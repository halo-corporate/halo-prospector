/**
 * Geração de etiqueta no Melhor Envio: orquestra as 4 etapas da API
 *   cart → checkout → generate → print
 * O checkout DEBITA o saldo da conta — por isso o caller (action) só chega aqui
 * depois de confirmação explícita do usuário. Devolve o id do pedido, a URL do
 * PDF da etiqueta e (best-effort) o código de rastreio.
 */
import { type MelhorEnvioConfig } from "./config";
import { meFetch } from "./api";

export interface EnderecoEtiqueta {
  name: string;
  phone?: string;
  email?: string;
  document?: string; // CPF/CNPJ só dígitos
  address: string;
  complement?: string;
  number: string;
  district?: string;
  city?: string;
  state_abbr?: string;
  postal_code: string; // só dígitos
}

export interface EtiquetaParams {
  serviceId: number;
  from: EnderecoEtiqueta;
  to: EnderecoEtiqueta;
  volume: { height: number; width: number; length: number; weight: number }; // weight em kg
  insuranceValue: number;
  productName: string;
}

export interface EtiquetaResult {
  orderId: string;
  pdfUrl: string;
  codigoRastreio: string | null;
  trackingUrl: string | null;
}

export type GerarEtiquetaResult =
  | { ok: true; data: EtiquetaResult }
  | { ok: false; message: string };

interface CartItem {
  id: string;
  protocol?: string;
  tracking?: string | null;
  self_tracking?: string | null;
}

interface PrintResponse {
  url?: string;
}

interface OrderInfo {
  tracking?: string | null;
  self_tracking?: string | null;
}

const withCountry = (e: EnderecoEtiqueta) => ({
  name: e.name,
  phone: e.phone,
  email: e.email,
  document: e.document,
  address: e.address,
  complement: e.complement,
  number: e.number,
  district: e.district,
  city: e.city,
  state_abbr: e.state_abbr,
  postal_code: e.postal_code,
  country_id: "BR",
});

export async function gerarEtiqueta(
  cfg: MelhorEnvioConfig,
  accessToken: string,
  params: EtiquetaParams,
): Promise<GerarEtiquetaResult> {
  // 1) cart — monta o pedido (não cobra).
  const cartBody = {
    service: params.serviceId,
    from: withCountry(params.from),
    to: withCountry(params.to),
    products: [
      {
        name: params.productName,
        quantity: 1,
        unitary_value: params.insuranceValue,
      },
    ],
    volumes: [
      {
        height: params.volume.height,
        width: params.volume.width,
        length: params.volume.length,
        weight: params.volume.weight,
      },
    ],
    options: {
      insurance_value: params.insuranceValue,
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true,
    },
  };

  const cart = await meFetch<CartItem>(cfg, accessToken, "/api/v2/me/cart", {
    method: "POST",
    body: cartBody,
  });
  if (!cart.ok) return { ok: false, message: `Falha ao montar o pedido: ${cart.message}` };
  const orderId = cart.data?.id;
  if (!orderId) return { ok: false, message: "Melhor Envio não devolveu o id do pedido." };

  // 2) checkout — PAGA (debita o saldo).
  const checkout = await meFetch<unknown>(
    cfg,
    accessToken,
    "/api/v2/me/shipment/checkout",
    { method: "POST", body: { orders: [orderId] } },
  );
  if (!checkout.ok) {
    return { ok: false, message: `Falha no checkout (saldo insuficiente?): ${checkout.message}` };
  }

  // 3) generate — emite a etiqueta.
  const generate = await meFetch<unknown>(
    cfg,
    accessToken,
    "/api/v2/me/shipment/generate",
    { method: "POST", body: { orders: [orderId] } },
  );
  if (!generate.ok) {
    return {
      ok: false,
      message: `Pedido pago, mas falhou ao gerar a etiqueta (id ${orderId}): ${generate.message}`,
    };
  }

  // 4) print — devolve a URL do PDF.
  const print = await meFetch<PrintResponse>(
    cfg,
    accessToken,
    "/api/v2/me/shipment/print",
    { method: "POST", body: { mode: "private", orders: [orderId] } },
  );
  if (!print.ok || !print.data?.url) {
    return {
      ok: false,
      message: `Etiqueta gerada, mas falhou ao obter o PDF (id ${orderId}): ${print.ok ? "sem URL" : print.message}`,
    };
  }

  // Best-effort: busca rastreio do pedido (não falha o fluxo se não vier).
  let codigoRastreio: string | null = cart.data.tracking ?? null;
  let trackingUrl: string | null = null;
  const order = await meFetch<OrderInfo>(cfg, accessToken, `/api/v2/me/orders/${orderId}`);
  if (order.ok) {
    codigoRastreio = order.data?.tracking ?? codigoRastreio;
    if (order.data?.self_tracking) trackingUrl = order.data.self_tracking;
  }

  return {
    ok: true,
    data: { orderId, pdfUrl: print.data.url, codigoRastreio, trackingUrl },
  };
}
