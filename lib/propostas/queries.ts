import { createClient } from "@/lib/supabase/server";
import type { Proposta, PropostaStatus } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListPropostasFilters {
  status?: PropostaStatus;
  q?: string; // busca cliente
  valorMin?: number;
  valorMax?: number;
  dataInicio?: string; // yyyy-MM-dd
  dataFim?: string;
}

/**
 * Lista propostas aplicando filtros. Tolerante a migration 0009 pendente.
 */
export async function listPropostas(
  filters: ListPropostasFilters = {},
): Promise<Proposta[]> {
  const supabase = createClient();
  let query = supabase
    .from("propostas")
    .select("*")
    .order("data_envio", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q && filters.q.trim()) {
    query = query.ilike("cliente", `%${filters.q.trim()}%`);
  }
  if (typeof filters.valorMin === "number") {
    query = query.gte("valor_total", filters.valorMin);
  }
  if (typeof filters.valorMax === "number") {
    query = query.lte("valor_total", filters.valorMax);
  }
  if (filters.dataInicio) query = query.gte("data_envio", filters.dataInicio);
  if (filters.dataFim) query = query.lte("data_envio", filters.dataFim);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listPropostas] Tabela `propostas` não existe — rode a migration 0009.",
      );
      return [];
    }
    console.error("[listPropostas]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getPropostaById(id: string): Promise<Proposta | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getPropostaById]", error);
    throw new Error(error.message);
  }
  return data;
}
