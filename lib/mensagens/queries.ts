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
  /** Aceita 1+ canais (filtro multi). Vazio = sem filtro de canal. */
  canais?: MensagemCanal[];
  /** Aceita 1+ etapas (filtro multi). Vazio = sem filtro de etapa. */
  etapas?: string[];
  q?: string;
}

/**
 * Lista templates do usuário. Tolerante a migration 0005/0010 pendente.
 *
 * Filtro por canal/etapa usa `.overlaps()` nas colunas array (canais,
 * etapas_funil) — retorna templates que tenham QUALQUER um dos valores
 * passados.
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

  if (filters.canais && filters.canais.length > 0) {
    query = query.overlaps("canais", filters.canais);
  }
  if (filters.etapas && filters.etapas.length > 0) {
    query = query.overlaps("etapas_funil", filters.etapas);
  }
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
 * Devolve a lista distinta de etapas de funil usadas pelo usuário (achatada
 * dos arrays `etapas_funil` de cada template). Alimenta o filtro.
 */
export async function listEtapas(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mensagem_templates")
    .select("etapas_funil");
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listEtapas]", error);
    return [];
  }
  const set = new Set<string>();
  for (const r of data ?? []) {
    const arr = (r as { etapas_funil: string[] | null }).etapas_funil;
    if (Array.isArray(arr)) {
      for (const e of arr) if (e) set.add(e);
    }
  }
  return Array.from(set).sort();
}
