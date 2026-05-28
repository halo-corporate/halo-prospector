import { createClient } from "@/lib/supabase/server";
import { currentWeekStartBR } from "@/lib/timezone";
import type { TarefaSemanal } from "@/lib/database.types";

/**
 * Lista as tarefas de uma semana específica (default: semana atual em BR).
 * Ordena por `ordem` então `created_at`.
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
    console.error("[listTarefasDaSemana]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
