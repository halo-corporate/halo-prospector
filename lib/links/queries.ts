import { createSessionClient } from "@/lib/supabase/session";
import type { Link } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

/**
 * Lista todos os links do usuário, ordenados por `ordem` então
 * `created_at desc`. Em caso de tabela inexistente (migration 0004
 * pendente), retorna lista vazia pra UI mostrar empty state em vez de
 * quebrar.
 */
export async function listLinks(): Promise<Link[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listLinks] Tabela `links` não existe — rode a migration 0004.",
      );
      return [];
    }
    console.error("[listLinks]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
