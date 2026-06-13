/**
 * Cotação de frete via Melhor Envio (POST /api/v2/me/shipment/calculate).
 * Recebe origem/destino + pacote e devolve as opções de transportadora/serviço
 * com preço e prazo. Não cria pedido nem cobra nada — é só consulta.
 */
import { type MelhorEnvioConfig } from "./config";
import { meFetch } from "./api";

export interface CotacaoInput {
  fromCep: string; // só dígitos (8)
  toCep: string; // só dígitos (8)
  pesoG: number; // gramas (> 0)
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
}

export interface CotacaoOpcao {
  servicoId: number;
  transportadora: string;
  servico: string;
  valor: number; // R$
  prazoDias: number | null;
}

/** Item bruto retornado pela API (campos que usamos). */
interface CalculateItem {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  company?: { id: number; name: string };
  error?: string;
}

export type CotacaoResult =
  | { ok: true; opcoes: CotacaoOpcao[] }
  | { ok: false; message: string };

export async function calcularFrete(
  cfg: MelhorEnvioConfig,
  accessToken: string,
  input: CotacaoInput,
): Promise<CotacaoResult> {
  const body = {
    from: { postal_code: input.fromCep },
    to: { postal_code: input.toCep },
    package: {
      height: input.alturaCm,
      width: input.larguraCm,
      length: input.comprimentoCm,
      weight: input.pesoG / 1000, // API espera kg
    },
    options: { receipt: false, own_hand: false },
  };

  const res = await meFetch<CalculateItem[]>(
    cfg,
    accessToken,
    "/api/v2/me/shipment/calculate",
    { method: "POST", body },
  );

  if (!res.ok) {
    return { ok: false, message: `Cotação recusada pelo Melhor Envio: ${res.message}` };
  }
  if (!Array.isArray(res.data)) {
    // Diagnóstico temporário: expõe o corpo bruto pra entender o formato real.
    const snippet = JSON.stringify(res.data ?? null).slice(0, 400);
    console.error("[calcularFrete] resposta não-array:", snippet);
    return {
      ok: false,
      message: `Resposta inesperada do Melhor Envio (${typeof res.data}): ${snippet}`,
    };
  }

  const opcoes: CotacaoOpcao[] = res.data
    .filter((it) => !it.error && (it.custom_price || it.price))
    .map((it) => {
      const precoStr = it.custom_price ?? it.price ?? "0";
      return {
        servicoId: it.id,
        transportadora: it.company?.name ?? "—",
        servico: it.name,
        valor: Number(precoStr),
        prazoDias: typeof it.delivery_time === "number" ? it.delivery_time : null,
      };
    })
    .filter((o) => Number.isFinite(o.valor))
    .sort((a, b) => a.valor - b.valor);

  if (opcoes.length === 0) {
    return {
      ok: false,
      message:
        "Nenhum serviço disponível pra esse trajeto/pacote. Confira CEPs, peso e dimensões.",
    };
  }

  return { ok: true, opcoes };
}
