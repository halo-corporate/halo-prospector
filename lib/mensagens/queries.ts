import { createClient } from "@/lib/supabase/server";
import type { MensagemTemplate, MensagemCanal } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListTemplatesFilters {
  canal?: MensagemCanal;
  etapa?: string;
  q?: string;
}

/**
 * Lista templates do usuário. Tolerante a migration 0005 pendente
 * (retorna lista vazia + warning).
 */
export async function listTemplates(
  filters: ListTemplatesFilters = {},
): Promise<MensagemTemplate[]> {
  const supabase = createClient();

  let query = supabase
    .from("mensagem_templates")
    .select("*")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters.canal) query = query.eq("canal", filters.canal);
  if (filters.etapa) query = query.eq("etapa_funil", filters.etapa);
  if (filters.q && filters.q.trim()) {
    query = query.ilike("titulo", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listTemplates] Tabela `mensagem_templates` não existe — rode a migration 0005.",
      );
      return [];
    }
    console.error("[listTemplates]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Devolve a lista distinta de etapas de funil usadas pelo usuário,
 * pra alimentar dropdown de filtro.
 */
export async function listEtapas(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mensagem_templates")
    .select("etapa_funil")
    .not("etapa_funil", "is", null);
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listEtapas]", error);
    return [];
  }
  const set = new Set<string>();
  for (const r of data ?? []) {
    if (r.etapa_funil) set.add(r.etapa_funil);
  }
  return Array.from(set).sort();
}
