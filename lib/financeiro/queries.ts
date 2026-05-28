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
