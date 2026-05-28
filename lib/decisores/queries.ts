import { createClient } from "@/lib/supabase/server";
import type { Decisor } from "@/lib/database.types";

/**
 * Lista decisores de um lead, ordenados por prioridade (d1 < d2 < d3) e nome.
 */
export async function listDecisoresByLead(leadId: string): Promise<Decisor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisores")
    .select("*")
    .eq("lead_id", leadId)
    .order("prioridade", { ascending: true })
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listDecisoresByLead]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Busca, em batch, o decisor de maior prioridade (D1 quando existe; senão D2;
 * etc.) para cada lead na lista. Usado pela tabela de leads.
 * Retorna um Map<lead_id, nome_d1>.
 */
export async function fetchPrimaryDecisorMap(
  leadIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (leadIds.length === 0) return out;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisores")
    .select("lead_id, nome, prioridade")
    .in("lead_id", leadIds)
    .order("prioridade", { ascending: true })
    .order("nome", { ascending: true });
  if (error) {
    console.error("[fetchPrimaryDecisorMap]", error);
    return out;
  }
  // Como veio ordenado por prioridade asc, a primeira ocorrência de cada
  // lead_id é o de maior prioridade (d1 < d2 < d3).
  for (const row of data ?? []) {
    if (!out.has(row.lead_id)) out.set(row.lead_id, row.nome);
  }
  return out;
}
