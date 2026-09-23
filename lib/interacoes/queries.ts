import { createSessionClient } from "@/lib/supabase/session";
import type {
  Interacao,
  InteracaoCanal,
  InteracaoTipo,
} from "@/lib/database.types";

export interface RecentInteracao {
  id: string;
  lead_id: string;
  lead_empresa: string;
  data_hora: string;
  canal: InteracaoCanal;
  tipo: InteracaoTipo;
  resumo: string;
}

/**
 * Lista interações de um lead, ordem cronológica reversa (mais recentes primeiro).
 */
export async function listInteracoesByLead(
  leadId: string,
): Promise<Interacao[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("interacoes")
    .select("*")
    .eq("lead_id", leadId)
    .order("data_hora", { ascending: false });
  if (error) {
    console.error("[listInteracoesByLead]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Para cada lead na lista, retorna a interação mais recente (se houver).
 * Map<lead_id, { canal, data_hora }>.
 */
export async function fetchLastInteracaoMap(
  leadIds: string[],
): Promise<Map<string, { canal: string; data_hora: string }>> {
  const out = new Map<string, { canal: string; data_hora: string }>();
  if (leadIds.length === 0) return out;

  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("interacoes")
    .select("lead_id, canal, data_hora")
    .in("lead_id", leadIds)
    .order("data_hora", { ascending: false });
  if (error) {
    console.error("[fetchLastInteracaoMap]", error);
    return out;
  }
  for (const row of data ?? []) {
    if (!out.has(row.lead_id)) {
      out.set(row.lead_id, { canal: row.canal, data_hora: row.data_hora });
    }
  }
  return out;
}

/**
 * Últimas N interações em todos os leads, com o nome da empresa joined.
 * Usado no dashboard.
 */
export async function listRecentInteracoes(
  limit = 5,
): Promise<RecentInteracao[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("interacoes")
    .select("id, lead_id, data_hora, canal, tipo, resumo, leads(empresa)")
    .order("data_hora", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[listRecentInteracoes]", error);
    return [];
  }
  return (data ?? []).map((r) => {
    // `leads` vem como objeto único da FK (não array).
    const leadsField = r.leads as unknown as { empresa: string } | null;
    return {
      id: r.id,
      lead_id: r.lead_id,
      lead_empresa: leadsField?.empresa ?? "—",
      data_hora: r.data_hora,
      canal: r.canal,
      tipo: r.tipo,
      resumo: r.resumo,
    };
  });
}
