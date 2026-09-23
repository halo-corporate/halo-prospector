import { createSessionClient } from "@/lib/supabase/session";
import { todayRangeBR, nextNDaysRangeBR, BR_TZ } from "@/lib/timezone";
import { toZonedTime } from "date-fns-tz";
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
  /** Aceita 1+ verticais. Vazio = sem filtro. Usa `.overlaps()`. */
  verticais?: string[];
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
 *
 * Filtro de vertical usa `.overlaps('verticais', ...)` — retorna leads que
 * tenham QUALQUER um dos slugs passados.
 */
export async function listLeads(filters: ListLeadsFilters = {}): Promise<Lead[]> {
  const supabase = createSessionClient();
  const orderBy: LeadOrderBy = filters.orderBy ?? "updated_at";
  const ascending = (filters.orderDir ?? "desc") === "asc";

  let query = supabase
    .from("leads")
    .select("*")
    .order(orderBy, { ascending, nullsFirst: false });

  if (filters.verticais && filters.verticais.length > 0) {
    query = query.overlaps("verticais", filters.verticais);
  }
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
export async function listOverdueFollowups(limit?: number): Promise<Lead[]> {
  const supabase = createSessionClient();
  const nowBR = toZonedTime(new Date(), BR_TZ);
  const nowIso = nowBR.toISOString();
  let q = supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .lt("proximo_followup", nowIso)
    .order("proximo_followup", { ascending: true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
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
export async function listTodayFollowups(limit?: number): Promise<Lead[]> {
  const supabase = createSessionClient();
  const { endUtc } = todayRangeBR();
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .gte("proximo_followup", nowIso)
    .lte("proximo_followup", endUtc.toISOString())
    .order("proximo_followup", { ascending: true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
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
  limit?: number,
): Promise<Lead[]> {
  const supabase = createSessionClient();
  const { startUtc, endUtc } = nextNDaysRangeBR(days);
  let q = supabase
    .from("leads")
    .select("*")
    .not("proximo_followup", "is", null)
    .gte("proximo_followup", startUtc.toISOString())
    .lte("proximo_followup", endUtc.toISOString())
    .order("proximo_followup", { ascending: true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
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
  const supabase = createSessionClient();
  const nowBR = toZonedTime(new Date(), BR_TZ);
  const nowIso = nowBR.toISOString();
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
  const supabase = createSessionClient();
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
