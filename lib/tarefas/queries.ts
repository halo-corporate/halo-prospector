import { createClient } from "@/lib/supabase/server";
import { currentWeekStartBR } from "@/lib/timezone";
import type { TarefaSemanal } from "@/lib/database.types";

const PG_UNDEFINED_TABLE = "42P01";

/**
 * Lista as tarefas de uma semana específica (default: semana atual em BR).
 * Em caso de tabela inexistente (migration pendente), devolve [] e loga warning.
 */
export async function listTarefasDaSemana(
  weekStartISO?: string,
): Promise<TarefaSemanal[]> {
  const semana = weekStartISO ?? currentWeekStartBR();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tarefas_semanais")
    .select("*")
    .eq("semana", semana)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      console.warn(
        "[listTarefasDaSemana] Tabela `tarefas_semanais` não existe — rode a migration 0002.",
      );
      return [];
    }
    console.error("[listTarefasDaSemana]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * True se a tabela `tarefas_semanais` ainda não existe (migration pendente).
 * Usado pela UI pra exibir banner amarelo.
 */
export async function tarefasTableExists(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .select("id")
    .limit(1);
  if (error && error.code === PG_UNDEFINED_TABLE) return false;
  return true;
}
