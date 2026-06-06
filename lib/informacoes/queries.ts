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
  /** Filtro multi por categoria. Usa `.overlaps()` no array `categorias`. */
  categorias?: string[];
  q?: string;
}

/**
 * Lista informações do usuário. Tolerante a migration 0006/0010 pendente.
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

  if (filters.categorias && filters.categorias.length > 0) {
    query = query.overlaps("categorias", filters.categorias);
  }
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
 * Lista categorias distintas (achatadas dos arrays `categorias` de cada
 * informação). Alimenta o filtro multi.
 */
export async function listInformacaoCategorias(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("informacoes")
    .select("categorias");
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listInformacaoCategorias]", error);
    return [];
  }
  const set = new Set<string>();
  for (const r of data ?? []) {
    const arr = (r as { categorias: string[] | null }).categorias;
    if (Array.isArray(arr)) {
      for (const c of arr) if (c) set.add(c);
    }
  }
  return Array.from(set).sort();
}
