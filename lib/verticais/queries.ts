import { createSessionClient } from "@/lib/supabase/session";
import {
  DEFAULT_VERTICAL_LABELS,
  DEFAULT_VERTICAL_SLUGS,
  type Vertical,
} from "@/lib/database.types";

// O Supabase/PostgREST pode retornar a falha de tabela inexistente como:
// - code "42P01" (Postgres direto: undefined_table)
// - code "PGRST205" (PostgREST: schema cache miss)
// - mensagem contendo "schema cache" ou "does not exist"
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
 * Fallback in-memory dos 5 defaults — usado se a tabela `verticais` ainda
 * não existir (migration 0002 não rodada). Permite o app continuar
 * funcionando com as verticais default mesmo antes da migration.
 */
function defaultVerticais(): Vertical[] {
  const now = new Date(0).toISOString();
  return DEFAULT_VERTICAL_SLUGS.map((slug, i) => ({
    id: `default-${slug}`,
    user_id: "",
    slug,
    label: DEFAULT_VERTICAL_LABELS[slug],
    is_default: true,
    ordem: i + 1,
    created_at: now,
    updated_at: now,
  }));
}

/**
 * Lista todas as verticais do usuário, ordenadas por `ordem` então `label`.
 * Em caso de tabela inexistente (migration pendente), devolve os 5 defaults
 * em memória pra UI não quebrar.
 */
export async function listVerticais(): Promise<Vertical[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("verticais")
    .select("*")
    .order("ordem", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listVerticais] Tabela `verticais` não existe — usando defaults em memória. Rode a migration 0002.",
      );
      return defaultVerticais();
    }
    console.error("[listVerticais]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
