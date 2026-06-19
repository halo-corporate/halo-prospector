// PASSO 5-B.2 · Metade 1 (LEITURA) — as leituras do checklist agora vêm da
// `tasks` do ALIEN (system='HALO'), via o client service-role da ponte
// (alien-server.ts). As ESCRITAS (lib/tarefas/actions.ts) ainda apontam pro
// HALO — Metade 2 cuida delas.
//
// ⚠️ A tasks do ALIEN é single-user (só o Gabriel), sem RLS por usuário: não há
// lógica de user_id/RLS aqui. O alien-server.ts é server-only.
import { createAlienClient } from "@/lib/supabase/alien-server";
import { currentWeekStartBR } from "@/lib/timezone";
import type {
  AlienTasksRow,
  AlienCategoriesRow,
} from "@/lib/supabase/alien-database.types";
import type {
  CategoriaTarefa,
  TarefaPrioridade,
  TarefaSemanal,
} from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

// ALIEN priority ('baixa'|'média'|'alta') → HALO prioridade (sem acento).
function prioridadeFromAlien(p: AlienTasksRow["priority"]): TarefaPrioridade {
  if (p === "média") return "media";
  return p; // 'alta' | 'baixa' batem
}

// tasks (ALIEN) → shape TarefaSemanal que a UI do checklist espera.
function mapTaskToTarefa(row: AlienTasksRow): TarefaSemanal {
  return {
    id: row.id,
    user_id: "", // tasks do ALIEN não tem user_id (single-user)
    semana: row.semana ?? "",
    texto: row.title,
    observacoes: row.details,
    concluida: row.status === "feita",
    concluida_em: row.completed_at,
    stand_by: row.stand_by ?? false,
    prioridade: prioridadeFromAlien(row.priority),
    prazo: row.due_date,
    categoria_id: row.category_id ?? null,
    parent_id: row.parent_id,
    ordem: row.ordem ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// categories (ALIEN) → CategoriaTarefa que a UI espera.
function mapCategoria(row: AlienCategoriesRow): CategoriaTarefa {
  return {
    id: row.id,
    user_id: "",
    nome: row.nome,
    cor: row.cor,
    ordem: row.ordem ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Lista as tarefas HALO de uma semana (default: semana atual BR) a partir da
 * tasks do ALIEN. Inclui pais e subtarefas (a UI separa por parent_id).
 */
export async function listTarefasDaSemana(
  weekStartISO?: string,
): Promise<TarefaSemanal[]> {
  const semana = weekStartISO ?? currentWeekStartBR();
  const supabase = createAlienClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("system", "HALO")
    .eq("semana", semana)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[listTarefasDaSemana] tasks (ALIEN) indisponível.");
      return [];
    }
    console.error("[listTarefasDaSemana]", error);
    throw new Error(error.message);
  }
  return (data ?? []).map(mapTaskToTarefa);
}

/**
 * Histórico "Tarefas concluídas": tasks HALO com status='feita', mais recentes
 * primeiro (por completed_at).
 */
export async function listTarefasConcluidas(
  limit = 500,
): Promise<TarefaSemanal[]> {
  const supabase = createAlienClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("system", "HALO")
    .eq("status", "feita")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listTarefasConcluidas]", error);
    throw new Error(error.message);
  }
  return (data ?? []).map(mapTaskToTarefa);
}

/**
 * Categorias do checklist: tabela `categories` do ALIEN com system='HALO'.
 */
export async function listCategorias(): Promise<CategoriaTarefa[]> {
  const supabase = createAlienClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("system", "HALO")
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[listCategorias] categories (ALIEN) indisponível.");
      return [];
    }
    console.error("[listCategorias]", error);
    throw new Error(error.message);
  }
  return (data ?? []).map(mapCategoria);
}

/**
 * True se a `tasks` do ALIEN está acessível. Mantido por compat (a UI não usa
 * mais), agora aponta pro ALIEN.
 */
export async function tarefasTableExists(): Promise<boolean> {
  const supabase = createAlienClient();
  const { error } = await supabase.from("tasks").select("id").limit(1);
  if (error && isMissingTableError(error)) return false;
  return true;
}
