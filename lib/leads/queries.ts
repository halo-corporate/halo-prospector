import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  LeadStatus,
  LeadTemperatura,
} from "@/lib/database.types";

export type LeadOrderBy =
  | "updated_at"
  | "created_at"
  | "empresa"
  | "proximo_followup";

export interface ListLeadsFilters {
  vertical?: string;
  status?: LeadStatus;
  temperatura?: LeadTemperatura;
  estado?: string;
  cidade?: string;
  q?: string;
  orderBy?: LeadOrderBy;
  orderDir?: "asc" | "desc";
}

/**
 * Lista leads aplicando filtros. RLS no banco garante que só vêm os do usuário.
 * Default: ordenado por updated_at desc.
 */
export async function listLeads(filters: ListLeadsFilters = {}): Promise<Lead[]> {
  const supabase = createClient();
  const orderBy: LeadOrderBy = filters.orderBy ?? "updated_at";
  const ascending = (filters.orderDir ?? "desc") === "asc";

  let query = supabase
    .from("leads")
    .select("*")
    .order(orderBy, { ascending, nullsFirst: false });

  if (filters.vertical) query = query.eq("vertical", filters.vertical);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.temperatura) query = query.eq("temperatura", filters.temperatura);
  if (filters.estado) query = query.eq("estado", filters.estado.toUpperCase());
  if (filters.cidade) query = query.ilike("cidade", `%${filters.cidade}%`);
  if (filters.q && filters.q.trim()) {
    query = query.ilike("empresa", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[listLeads]", error);
    throw new Error(`Falha ao buscar leads: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Busca um lead por ID. Retorna null se não existir ou se não for do usuário
 * (RLS bloqueia leitura).
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getLeadById]", error);
    throw new Error(`Falha ao buscar lead: ${error.message}`);
  }
  return data;
}
