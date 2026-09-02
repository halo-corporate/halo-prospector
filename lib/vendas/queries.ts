import { createSessionClient } from "@/lib/supabase/session";
import type { Venda } from "@/lib/database.types";

/**
 * Lista todas as vendas do usuário, ordenadas por data_venda desc (mais
 * recentes primeiro). RLS no banco garante que só vêm as do dono.
 */
export async function listVendas(): Promise<Venda[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .order("data_venda", { ascending: false });

  if (error) {
    console.error("[listVendas]", error);
    throw new Error(`Falha ao buscar vendas: ${error.message}`);
  }
  return data ?? [];
}

export interface VendasTotais {
  totalVendido: number;
  totalRecebido: number;
  aReceber: number;
  countTotal: number;
  countPagas: number;
  countPendentes: number;
  countCanceladas: number;
}

/**
 * Agregados pros KPIs. `valor_liquido` é coluna gerada no banco
 * (quantidade*valor_unitario - desconto). Soma em JS — volume single-user,
 * e RLS já restringe às vendas do dono.
 *   totalVendido  = Σ valor_liquido onde status != 'cancelado'
 *   totalRecebido = Σ valor_liquido onde status = 'pago'
 *   aReceber      = totalVendido − totalRecebido (cancelada já fora)
 */
export async function getVendasTotais(): Promise<VendasTotais> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("valor_liquido, status");

  if (error) {
    console.error("[getVendasTotais]", error);
    throw new Error(`Falha ao buscar totais de vendas: ${error.message}`);
  }

  const rows = data ?? [];
  let totalVendido = 0;
  let totalRecebido = 0;
  let countPagas = 0;
  let countPendentes = 0;
  let countCanceladas = 0;

  for (const v of rows) {
    if (v.status === "cancelado") {
      countCanceladas += 1;
      continue; // cancelada não conta no total nem no a receber
    }
    totalVendido += v.valor_liquido;
    if (v.status === "pago") {
      totalRecebido += v.valor_liquido;
      countPagas += 1;
    } else if (v.status === "pendente") {
      countPendentes += 1;
    }
  }

  return {
    totalVendido,
    totalRecebido,
    aReceber: totalVendido - totalRecebido,
    countTotal: rows.length,
    countPagas,
    countPendentes,
    countCanceladas,
  };
}
