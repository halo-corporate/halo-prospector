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

export interface SemanaResumo {
  semana: string;
  total: number;
  concluidas: number;
}

/**
 * Lista as semanas anteriores à semana de referência (exclusiva), agrupando
 * por `semana` e contando total/concluídas. Ordenado mais recente primeiro.
 */
export async function listSemanasAnteriores(
  beforeWeekISO: string,
  limit = 26,
): Promise<SemanaResumo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tarefas_semanais")
    .select("semana, concluida")
    .lt("semana", beforeWeekISO)
    .order("semana", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listSemanasAnteriores]", error);
    throw new Error(error.message);
  }

  const map = new Map<string, { total: number; concluidas: number }>();
  for (const row of data ?? []) {
    const key = row.semana as string;
    const acc = map.get(key) ?? { total: 0, concluidas: 0 };
    acc.total++;
    if (row.concluida) acc.concluidas++;
    map.set(key, acc);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(([semana, agg]) => ({ semana, total: agg.total, concluidas: agg.concluidas }));
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
