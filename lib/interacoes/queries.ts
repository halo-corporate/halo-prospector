import { createClient } from "@/lib/supabase/server";
import type { Interacao } from "@/lib/database.types";

/**
 * Lista interações de um lead, ordem cronológica reversa (mais recentes primeiro).
 */
export async function listInteracoesByLead(
  leadId: string,
): Promise<Interacao[]> {
  const supabase = createClient();
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

  const supabase = createClient();
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
