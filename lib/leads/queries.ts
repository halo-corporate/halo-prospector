import { createClient } from "@/lib/supabase/server";
import { todayRangeBR, nextNDaysRangeBR } from "@/lib/timezone";
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
 * Leads com follow-up vencido (proximo_followup < agora).
 * Ordenado pelo mais antigo primeiro.
 */
export async function listOverdueFollowups(limit = 10): Promise<Lead[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .lt("proximo_followup", nowIso)
    .order("proximo_followup", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[listOverdueFollowups]", error);
    return [];
  }
  return data ?? [];
}

/**
 * Leads com follow-up de hoje (BR) que ainda não venceram (>= agora).
 * Evita overlap com vencidos.
 */
export async function listTodayFollowups(limit = 10): Promise<Lead[]> {
  const supabase = createClient();
  const { endUtc } = todayRangeBR();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .gte("proximo_followup", nowIso)
    .lte("proximo_followup", endUtc.toISOString())
    .order("proximo_followup", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[listTodayFollowups]", error);
    return [];
  }
  return data ?? [];
}

/**
 * Leads com follow-up entre amanhã e +N dias (BR).
 */
export async function listUpcomingFollowups(
  days = 7,
  limit = 10,
): Promise<Lead[]> {
  const supabase = createClient();
  const { startUtc, endUtc } = nextNDaysRangeBR(days);
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .gte("proximo_followup", startUtc.toISOString())
    .lte("proximo_followup", endUtc.toISOString())
    .order("proximo_followup", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[listUpcomingFollowups]", error);
    return [];
  }
  return data ?? [];
}

/**
 * Conta os leads em cada bucket de follow-up. Usado nos KPIs do dashboard.
 */
export async function countFollowupBuckets(): Promise<{
  overdue: number;
  today: number;
  upcoming: number;
}> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const { endUtc: endToday } = todayRangeBR();
  const { startUtc: startNext, endUtc: endNext } = nextNDaysRangeBR(7);

  const [a, b, c] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("proximo_followup", "is", null)
      .lt("proximo_followup", nowIso),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("proximo_followup", "is", null)
      .gte("proximo_followup", nowIso)
      .lte("proximo_followup", endToday.toISOString()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("proximo_followup", "is", null)
      .gte("proximo_followup", startNext.toISOString())
      .lte("proximo_followup", endNext.toISOString()),
  ]);

  return {
    overdue: a.count ?? 0,
    today: b.count ?? 0,
    upcoming: c.count ?? 0,
  };
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
