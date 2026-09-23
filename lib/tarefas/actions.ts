"use server";

// PASSO 5-B.2 · Metade 2 (ESCRITA) — as escritas do checklist agora vão pra
// `tasks` do ALIEN (system='HALO'), via o client service-role da ponte
// (alien-server.ts). Fecha o limbo: leitura (Metade 1) e escrita passam a falar
// com a mesma tabela. A `tarefas_semanais` do HALO fica como backup congelado —
// NADA aqui escreve mais nela.
//
// Mapa de escrita (UI/TarefaSemanal → tasks do ALIEN):
//   texto       → title
//   observacoes → details
//   concluida   → status ('feita' / 'pendente')
//   prioridade  → priority ('media' → 'média', com acento — INVERSO da leitura)
//   prazo       → due_date
//   categoria_id→ category_id
//   parent_id / ordem / stand_by / semana → diretos
//   todo insert leva system='HALO'.
//
// ⚠️ completed_at: o ALIEN tem trigger (tasks_sync_completed_at) que carimba
// completed_at quando status vira 'feita'. Então NÃO setamos completed_at na
// conclusão. Ao DESMARCAR, limpamos completed_at = null explicitamente (o trigger
// não garante a limpeza no caminho de volta).
//
// ⚠️ A `tasks` do ALIEN é single-user (só o Gabriel), sem RLS por usuário e o
// alien-server.ts é service-role server-only — não há user_id/RLS aqui. Toda
// query filtra system='HALO' pra não tocar tarefas de outros módulos do ALIEN.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAlienClient } from "@/lib/supabase/alien-server";
import { currentWeekStartBR } from "@/lib/timezone";
import type { AlienPriority, AlienStatus } from "@/lib/supabase/alien-database.types";

const textoSchema = z
  .string()
  .trim()
  .min(1, "Texto obrigatório")
  .max(200, "Máx 200 caracteres");

// Observações: opcional, trimadas, max 1000. String vazia → null.
const observacoesSchema = z
  .string()
  .max(1000, "Máx 1000 caracteres")
  .transform((s) => {
    const trimmed = s.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .nullable();

const semanaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Semana inválida")
  .optional();

const prioridadeSchema = z.enum(["alta", "media", "baixa"]);

// Prazo: ISO timestamptz ou null. String vazia → null.
const prazoSchema = z
  .string()
  .datetime({ offset: true })
  .nullable();

// HALO prioridade (sem acento) → ALIEN priority. Inverso de prioridadeFromAlien
// em queries.ts. 'media' é o único que diverge ('média', com acento no ALIEN).
function prioridadeToAlien(p: "alta" | "media" | "baixa"): AlienPriority {
  return p === "media" ? "média" : p;
}

export type TarefaActionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Cria uma tarefa nova na semana especificada (default: semana atual BR), na
 * `tasks` do ALIEN com system='HALO'. A ordem é o próximo inteiro depois da
 * maior `ordem` existente naquela semana (entre tarefas HALO).
 */
export async function createTarefaAction(
  texto: string,
  weekStartISO?: string,
): Promise<TarefaActionResult> {
  const t = textoSchema.safeParse(texto);
  if (!t.success) return { ok: false, message: t.error.issues[0]!.message };
  const s = semanaSchema.safeParse(weekStartISO);
  if (!s.success) return { ok: false, message: s.error.issues[0]!.message };

  const semana = s.data ?? currentWeekStartBR();
  const supabase = createAlienClient();

  const { data: max } = await supabase
    .from("tasks")
    .select("ordem")
    .eq("system", "HALO")
    .eq("semana", semana)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { error } = await supabase.from("tasks").insert({
    system: "HALO",
    semana,
    title: t.data,
    ordem: nextOrdem,
    status: "pendente" satisfies AlienStatus,
  });
  if (error) {
    console.error("[createTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Cria uma subtarefa sob uma tarefa-pai (tasks do ALIEN, system='HALO').
 * Decisão C: herda a `semana` da pai; se a pai não tiver semana, usa a semana
 * atual. Fica no fim da lista de irmãs (ordem = max das filhas + 1). Aninhamento
 * de 1 nível: se a pai já for subtarefa, recusa.
 */
export async function createSubtarefaAction(
  parentId: string,
  texto: string,
): Promise<TarefaActionResult> {
  if (typeof parentId !== "string" || parentId.length < 10) {
    return { ok: false, message: "ID da tarefa-pai inválido" };
  }
  const t = textoSchema.safeParse(texto);
  if (!t.success) return { ok: false, message: t.error.issues[0]!.message };

  const supabase = createAlienClient();
  const { data: parent, error: errParent } = await supabase
    .from("tasks")
    .select("semana, parent_id")
    .eq("id", parentId)
    .eq("system", "HALO")
    .maybeSingle();
  if (errParent) {
    console.error("[createSubtarefaAction parent]", errParent);
    return { ok: false, message: errParent.message };
  }
  if (!parent) return { ok: false, message: "Tarefa-pai não encontrada" };
  if (parent.parent_id) {
    return { ok: false, message: "Subtarefa não pode ter subtarefa" };
  }

  // Decisão C: herda semana da mãe; sem semana na mãe → semana atual.
  const semana = parent.semana ?? currentWeekStartBR();

  const { data: max } = await supabase
    .from("tasks")
    .select("ordem")
    .eq("system", "HALO")
    .eq("parent_id", parentId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { error } = await supabase.from("tasks").insert({
    system: "HALO",
    semana,
    title: t.data,
    ordem: nextOrdem,
    parent_id: parentId,
    status: "pendente" satisfies AlienStatus,
  });
  if (error) {
    console.error("[createSubtarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Alterna a conclusão (status 'feita' / 'pendente'). Concluir zera `stand_by`
 * (mutualmente exclusivos) e deixa o trigger do ALIEN carimbar `completed_at`.
 * Desmarcar limpa `completed_at` explicitamente.
 */
export async function toggleTarefaAction(
  id: string,
  concluida: boolean,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const supabase = createAlienClient();
  const patch = concluida
    ? { status: "feita" as AlienStatus, stand_by: false }
    : { status: "pendente" as AlienStatus, completed_at: null };
  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[toggleTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Alterna a flag `stand_by`. Marcar como stand_by zera a conclusão (status volta
 * a 'pendente' e limpa completed_at) — mutualmente exclusivos.
 */
export async function toggleStandByTarefaAction(
  id: string,
  standBy: boolean,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const supabase = createAlienClient();
  const patch = standBy
    ? { stand_by: true, status: "pendente" as AlienStatus, completed_at: null }
    : { stand_by: false };
  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[toggleStandByTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Atualiza a prioridade da tarefa (alta / média / baixa).
 */
export async function updateTarefaPrioridadeAction(
  id: string,
  prioridade: "alta" | "media" | "baixa",
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const p = prioridadeSchema.safeParse(prioridade);
  if (!p.success) return { ok: false, message: p.error.issues[0]!.message };
  const supabase = createAlienClient();
  const { error } = await supabase
    .from("tasks")
    .update({ priority: prioridadeToAlien(p.data) })
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[updateTarefaPrioridadeAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Define ou limpa o prazo (deadline) da tarefa. `prazoIso` null remove o prazo.
 * Espera ISO UTC com offset (o client converte de input BR pra UTC).
 */
export async function updateTarefaPrazoAction(
  id: string,
  prazoIso: string | null,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const p = prazoSchema.safeParse(prazoIso);
  if (!p.success) return { ok: false, message: "Prazo inválido" };
  const supabase = createAlienClient();
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: p.data })
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[updateTarefaPrazoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Define ou limpa a categoria da tarefa. `categoriaId` null desagrupa (volta
 * pra "Sem categoria").
 */
export async function setTarefaCategoriaAction(
  id: string,
  categoriaId: string | null,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  if (categoriaId !== null) {
    const c = z.string().uuid().safeParse(categoriaId);
    if (!c.success) return { ok: false, message: "Categoria inválida" };
  }
  const supabase = createAlienClient();
  const { error } = await supabase
    .from("tasks")
    .update({ category_id: categoriaId })
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[setTarefaCategoriaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Atualiza o texto da tarefa (edição inline).
 */
export async function updateTarefaTextoAction(
  id: string,
  texto: string,
): Promise<TarefaActionResult> {
  const t = textoSchema.safeParse(texto);
  if (!t.success) return { ok: false, message: t.error.issues[0]!.message };
  const supabase = createAlienClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title: t.data })
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[updateTarefaTextoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Atualiza as observações da tarefa. String vazia ou só whitespace remove
 * a observação (vira null).
 */
export async function updateTarefaObservacoesAction(
  id: string,
  observacoes: string | null,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const parsed = observacoesSchema.safeParse(observacoes ?? "");
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createAlienClient();
  const { error } = await supabase
    .from("tasks")
    .update({ details: parsed.data })
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[updateTarefaObservacoesAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Deleta uma tarefa. Se for tarefa-pai, apaga também as subtarefas (deleta as
 * filhas antes, pra não deixar órfãs caso a FK parent_id do ALIEN não tenha
 * ON DELETE CASCADE).
 */
export async function deleteTarefaAction(
  id: string,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const supabase = createAlienClient();

  const { error: errSubs } = await supabase
    .from("tasks")
    .delete()
    .eq("system", "HALO")
    .eq("parent_id", id);
  if (errSubs) {
    console.error("[deleteTarefaAction subs]", errSubs);
    return { ok: false, message: errSubs.message };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("system", "HALO");
  if (error) {
    console.error("[deleteTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Copia tarefas NÃO concluídas da semana anterior para a semana atual (tasks do
 * ALIEN, system='HALO'). Útil pra "puxar pendências" no início da semana.
 * `status='pendente'` cobre tanto as a-fazer quanto as em stand_by (no ALIEN
 * stand_by é coluna à parte; o que não copiamos são as 'feita').
 */
export async function copyPendingFromPreviousWeekAction(): Promise<
  TarefaActionResult & { copied?: number }
> {
  const supabase = createAlienClient();
  const cur = currentWeekStartBR();
  const prevDate = new Date(cur);
  prevDate.setDate(prevDate.getDate() - 7);
  const prev = prevDate.toISOString().slice(0, 10);

  // Campos copiados pra preservar a tarefa "do mesmo jeito" — inclui a descrição
  // (details), categoria, prioridade, prazo e stand_by. O status fica 'pendente'
  // (puxar pendência = recriar como a fazer).
  const CAMPOS = "id, title, details, category_id, priority, due_date, stand_by, ordem";

  const { data: pendentes, error: errFetch } = await supabase
    .from("tasks")
    .select(CAMPOS)
    .eq("system", "HALO")
    .eq("semana", prev)
    .eq("status", "pendente")
    .is("parent_id", null)
    .order("ordem", { ascending: true });
  if (errFetch) {
    console.error("[copyPending]", errFetch);
    return { ok: false, message: errFetch.message };
  }
  if (!pendentes || pendentes.length === 0) {
    return { ok: true, copied: 0 };
  }

  // Subtarefas pendentes dessas tarefas-pai — vêm junto, religadas ao novo pai.
  const parentIds = pendentes.map((p) => p.id);
  const { data: subpendentes, error: errSub } = await supabase
    .from("tasks")
    .select(`${CAMPOS}, parent_id`)
    .eq("system", "HALO")
    .eq("semana", prev)
    .eq("status", "pendente")
    .in("parent_id", parentIds)
    .order("ordem", { ascending: true });
  if (errSub) {
    console.error("[copyPending sub]", errSub);
    return { ok: false, message: errSub.message };
  }

  const { data: max } = await supabase
    .from("tasks")
    .select("ordem")
    .eq("system", "HALO")
    .eq("semana", cur)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrdem = (max?.ordem ?? -1) + 1;

  // Insere as tarefas-pai e recupera os novos ids (na mesma ordem do input) pra
  // religar as subtarefas.
  const parentRows = pendentes.map((p) => ({
    system: "HALO" as const,
    semana: cur,
    title: p.title,
    details: p.details,
    category_id: p.category_id,
    priority: p.priority,
    due_date: p.due_date,
    stand_by: p.stand_by,
    ordem: nextOrdem++,
    status: "pendente" as AlienStatus,
  }));
  const { data: inseridas, error: errInsert } = await supabase
    .from("tasks")
    .insert(parentRows)
    .select("id");
  if (errInsert || !inseridas) {
    console.error("[copyPending insert]", errInsert);
    return { ok: false, message: errInsert?.message ?? "Falha ao copiar tarefas." };
  }

  // Mapeia o id antigo da pai -> id novo (insert devolve na ordem do input).
  const idMap = new Map<string, string>();
  pendentes.forEach((p, i) => {
    const novo = inseridas[i];
    if (novo) idMap.set(p.id, novo.id);
  });

  if (subpendentes && subpendentes.length > 0) {
    const subRows = subpendentes
      .map((s) => {
        const novoParent = s.parent_id ? idMap.get(s.parent_id) : undefined;
        if (!novoParent) return null;
        return {
          system: "HALO" as const,
          semana: cur,
          title: s.title,
          details: s.details,
          category_id: s.category_id,
          priority: s.priority,
          due_date: s.due_date,
          stand_by: s.stand_by,
          ordem: s.ordem,
          parent_id: novoParent,
          status: "pendente" as AlienStatus,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (subRows.length > 0) {
      const { error: errSubInsert } = await supabase
        .from("tasks")
        .insert(subRows);
      if (errSubInsert) {
        console.error("[copyPending sub insert]", errSubInsert);
        return { ok: false, message: errSubInsert.message };
      }
    }
  }

  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true, copied: inseridas.length };
}
