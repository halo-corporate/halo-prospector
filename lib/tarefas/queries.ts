import { createClient } from "@/lib/supabase/server";
import { currentWeekStartBR } from "@/lib/timezone";
import type { TarefaSemanal } from "@/lib/database.types";

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
    if (isMissingTableError(error)) {
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
 * Lista TODAS as tarefas já concluídas pelo user, ordenadas por data de
 * conclusão (mais recente primeiro). Usado pelo histórico "Tarefas concluídas".
 */
export async function listTarefasConcluidas(
  limit = 500,
): Promise<TarefaSemanal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tarefas_semanais")
    .select("*")
    .eq("concluida", true)
    .order("concluida_em", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listTarefasConcluidas]", error);
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
  if (error && isMissingTableError(error)) return false;
  return true;
}
