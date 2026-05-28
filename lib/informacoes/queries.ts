import { createClient } from "@/lib/supabase/server";
import type { Informacao } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListInformacoesFilters {
  categoria?: string;
  q?: string;
}

/**
 * Lista informações do usuário. Tolerante a migration 0006 pendente
 * (retorna lista vazia + warning).
 */
export async function listInformacoes(
  filters: ListInformacoesFilters = {},
): Promise<Informacao[]> {
  const supabase = createClient();

  let query = supabase
    .from("informacoes")
    .select("*")
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true });

  if (filters.categoria) query = query.eq("categoria", filters.categoria);
  if (filters.q && filters.q.trim()) {
    query = query.ilike("titulo", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listInformacoes] Tabela `informacoes` não existe — rode a migration 0006.",
      );
      return [];
    }
    console.error("[listInformacoes]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Lista categorias distintas presentes no banco (para alimentar filtro).
 */
export async function listInformacaoCategorias(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("informacoes")
    .select("categoria");
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listInformacaoCategorias]", error);
    return [];
  }
  const set = new Set<string>();
  for (const r of data ?? []) set.add(r.categoria);
  return Array.from(set).sort();
}
