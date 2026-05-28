import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_VERTICAL_LABELS,
  DEFAULT_VERTICAL_SLUGS,
  type Vertical,
} from "@/lib/database.types";

// Postgres code 42P01 = "undefined_table" (migration ainda não rodou)
const PG_UNDEFINED_TABLE = "42P01";

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
  const supabase = createClient();
  const { data, error } = await supabase
    .from("verticais")
    .select("*")
    .order("ordem", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
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
