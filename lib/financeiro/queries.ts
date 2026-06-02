import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "./format";
import type {
  Venda,
  VendaResponsavel,
  VendaStatus,
} from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListVendasFilters {
  responsavel?: VendaResponsavel;
  status?: VendaStatus;
  mes?: string; // yyyy-MM (filtra por data_venda)
  q?: string; // busca por cliente
}

/**
 * Lista vendas aplicando filtros. Tolerante a migration 0007 pendente.
 */
export async function listVendas(
  filters: ListVendasFilters = {},
): Promise<Venda[]> {
  const supabase = createClient();
  let query = supabase
    .from("vendas")
    .select("*")
    .order("data_venda", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.responsavel) query = query.eq("responsavel", filters.responsavel);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.mes) {
    const b = monthBounds(filters.mes);
    if (b) {
      query = query.gte("data_venda", b.start).lte("data_venda", b.end);
    }
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike("cliente", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listVendas] Tabela `vendas` não existe — rode a migration 0007.",
      );
      return [];
    }
    console.error("[listVendas]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Aggregate de vendas para um conjunto de filtros (usado no DRE).
 * Calcula em SQL via aggregate functions pra evitar trazer todas as rows
 * quando o usuário só precisa dos totais.
 *
 * Como o Supabase REST API não suporta `select(sum(...))` direto, fazemos
 * select dos campos numéricos e agregamos em memória. Para um single-user
 * com volumes razoáveis (<10k vendas/mês) isso é ok.
 */
export interface VendaAggregate {
  bruto: number;
  liquido: number;
  comissao: number;
  quantidade: number;
  ticketMedio: number;
}

export async function getVendasAggregate(
  filters: ListVendasFilters = {},
): Promise<VendaAggregate> {
  const supabase = createClient();
  let query = supabase
    .from("vendas")
    .select("valor_bruto, valor_liquido, comissao_valor");

  if (filters.responsavel) query = query.eq("responsavel", filters.responsavel);
  if (filters.status) {
    query = query.eq("status", filters.status);
  } else {
    // Regra de DRE: cancelado não conta em faturamento/comissão a não ser
    // que o user EXPLICITAMENTE filtre por cancelado (ai ele quer ver
    // esse dado isoladamente).
    query = query.neq("status", "cancelado");
  }
  if (filters.mes) {
    const b = monthBounds(filters.mes);
    if (b) query = query.gte("data_venda", b.start).lte("data_venda", b.end);
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike("cliente", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error))
      return { bruto: 0, liquido: 0, comissao: 0, quantidade: 0, ticketMedio: 0 };
    console.error("[getVendasAggregate]", error);
    return { bruto: 0, liquido: 0, comissao: 0, quantidade: 0, ticketMedio: 0 };
  }

  let bruto = 0;
  let liquido = 0;
  let comissao = 0;
  for (const r of data ?? []) {
    bruto += Number(r.valor_bruto ?? 0);
    liquido += Number(r.valor_liquido ?? 0);
    comissao += Number(r.comissao_valor ?? 0);
  }
  const qtd = (data ?? []).length;
  const ticketMedio = qtd > 0 ? liquido / qtd : 0;
  return { bruto, liquido, comissao, quantidade: qtd, ticketMedio };
}

/**
 * Breakdown por responsável (líquido + comissão + qtd).
 */
export interface ResponsavelBreakdown {
  responsavel: VendaResponsavel;
  liquido: number;
  comissao: number;
  quantidade: number;
}

export async function getBreakdownByResponsavel(
  filters: ListVendasFilters = {},
): Promise<ResponsavelBreakdown[]> {
  const supabase = createClient();
  let query = supabase
    .from("vendas")
    .select("responsavel, valor_liquido, comissao_valor");

  // V2 Entrega 4.4 fix: aplica TODOS os filtros, inclusive responsavel.
  // Antes a query intencionalmente ignorava responsavel pra "sempre
  // mostrar os 4". Mas isso quebrava os percentuais quando o user
  // filtrava por um responsavel (denominador filtrado vs numerador nao
  // filtrado = somam > 100%). Coerencia com o aggregate total agora.
  if (filters.responsavel) query = query.eq("responsavel", filters.responsavel);
  if (filters.status) {
    query = query.eq("status", filters.status);
  } else {
    // Mesma regra do DRE — cancelado fora salvo filtro explicito.
    query = query.neq("status", "cancelado");
  }
  if (filters.mes) {
    const b = monthBounds(filters.mes);
    if (b) query = query.gte("data_venda", b.start).lte("data_venda", b.end);
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike("cliente", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[getBreakdownByResponsavel]", error);
    return [];
  }

  const map = new Map<VendaResponsavel, ResponsavelBreakdown>();
  for (const r of data ?? []) {
    const cur = map.get(r.responsavel) ?? {
      responsavel: r.responsavel,
      liquido: 0,
      comissao: 0,
      quantidade: 0,
    };
    cur.liquido += Number(r.valor_liquido ?? 0);
    cur.comissao += Number(r.comissao_valor ?? 0);
    cur.quantidade += 1;
    map.set(r.responsavel, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.liquido - a.liquido);
}

/**
 * Breakdown por status (contagem + soma líquida).
 */
export interface StatusBreakdown {
  status: VendaStatus;
  quantidade: number;
  liquido: number;
}

export async function getBreakdownByStatus(
  filters: ListVendasFilters = {},
): Promise<StatusBreakdown[]> {
  const supabase = createClient();
  let query = supabase
    .from("vendas")
    .select("status, valor_liquido");

  // V2 Entrega 4.4 fix: aplica TODOS os filtros, inclusive status,
  // pela mesma razao do getBreakdownByResponsavel — coerencia com o
  // aggregate total. Se o user filtra status=pago, o breakdown
  // mostra so pago.
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.responsavel) query = query.eq("responsavel", filters.responsavel);
  if (filters.mes) {
    const b = monthBounds(filters.mes);
    if (b) query = query.gte("data_venda", b.start).lte("data_venda", b.end);
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike("cliente", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[getBreakdownByStatus]", error);
    return [];
  }

  const map = new Map<VendaStatus, StatusBreakdown>();
  for (const r of data ?? []) {
    const cur = map.get(r.status) ?? {
      status: r.status,
      quantidade: 0,
      liquido: 0,
    };
    cur.quantidade += 1;
    cur.liquido += Number(r.valor_liquido ?? 0);
    map.set(r.status, cur);
  }
  return Array.from(map.values());
}

export async function getVendaById(id: string): Promise<Venda | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getVendaById]", error);
    throw new Error(error.message);
  }
  return data;
}
