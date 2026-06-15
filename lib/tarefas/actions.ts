"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { currentWeekStartBR } from "@/lib/timezone";

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

export type TarefaActionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Cria uma tarefa nova na semana especificada (default: semana atual BR).
 * A ordem é o próximo inteiro depois da maior `ordem` existente naquela semana.
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
  const supabase = createClient();

  const { data: max } = await supabase
    .from("tarefas_semanais")
    .select("ordem")
    .eq("semana", semana)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { error } = await supabase
    .from("tarefas_semanais")
    .insert({ semana, texto: t.data, ordem: nextOrdem });
  if (error) {
    console.error("[createTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Cria uma subtarefa sob uma tarefa-pai. A subtarefa herda a `semana` da pai
 * e fica no fim da lista de irmãs (ordem = max das filhas + 1). Aninhamento de
 * 1 nível: se a pai já for uma subtarefa, recusa.
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

  const supabase = createClient();
  const { data: parent, error: errParent } = await supabase
    .from("tarefas_semanais")
    .select("semana, parent_id")
    .eq("id", parentId)
    .maybeSingle();
  if (errParent) {
    console.error("[createSubtarefaAction parent]", errParent);
    return { ok: false, message: errParent.message };
  }
  if (!parent) return { ok: false, message: "Tarefa-pai não encontrada" };
  if (parent.parent_id) {
    return { ok: false, message: "Subtarefa não pode ter subtarefa" };
  }

  const { data: max } = await supabase
    .from("tarefas_semanais")
    .select("ordem")
    .eq("parent_id", parentId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { error } = await supabase.from("tarefas_semanais").insert({
    semana: parent.semana,
    texto: t.data,
    ordem: nextOrdem,
    parent_id: parentId,
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
 * Alterna a flag `concluida`. Também grava `concluida_em` (timestamptz).
 * Concluir zera `stand_by` (mutualmente exclusivos — trigger no banco também
 * garante, mas a gente já manda o estado consistente).
 */
export async function toggleTarefaAction(
  id: string,
  concluida: boolean,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({
      concluida,
      concluida_em: concluida ? new Date().toISOString() : null,
      ...(concluida ? { stand_by: false } : {}),
    })
    .eq("id", id);
  if (error) {
    console.error("[toggleTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Alterna a flag `stand_by`. Marcar como stand_by zera `concluida`
 * (mutualmente exclusivos).
 */
export async function toggleStandByTarefaAction(
  id: string,
  standBy: boolean,
): Promise<TarefaActionResult> {
  if (typeof id !== "string" || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({
      stand_by: standBy,
      ...(standBy ? { concluida: false, concluida_em: null } : {}),
    })
    .eq("id", id);
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
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({ prioridade: p.data })
    .eq("id", id);
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
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({ prazo: p.data })
    .eq("id", id);
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
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({ categoria_id: categoriaId })
    .eq("id", id);
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
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({ texto: t.data })
    .eq("id", id);
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
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .update({ observacoes: parsed.data })
    .eq("id", id);
  if (error) {
    console.error("[updateTarefaObservacoesAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Deleta uma tarefa.
 */
export async function deleteTarefaAction(
  id: string,
): Promise<TarefaActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_semanais")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteTarefaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Copia tarefas NÃO concluídas da semana anterior para a semana atual.
 * Útil pra "puxar pendências" no início da semana.
 */
export async function copyPendingFromPreviousWeekAction(): Promise<
  TarefaActionResult & { copied?: number }
> {
  const supabase = createClient();
  const cur = currentWeekStartBR();
  const prevDate = new Date(cur);
  prevDate.setDate(prevDate.getDate() - 7);
  const prev = prevDate.toISOString().slice(0, 10);

  // Campos copiados pra preservar a tarefa "do mesmo jeito" — inclui a descrição
  // (observacoes), categoria, prioridade, prazo e stand_by. `concluida` fica no
  // default (false): puxar pendência = recriar como a fazer.
  const CAMPOS = "id, texto, observacoes, categoria_id, prioridade, prazo, stand_by, ordem";

  const { data: pendentes, error: errFetch } = await supabase
    .from("tarefas_semanais")
    .select(CAMPOS)
    .eq("semana", prev)
    .eq("concluida", false)
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
    .from("tarefas_semanais")
    .select(`${CAMPOS}, parent_id`)
    .eq("semana", prev)
    .eq("concluida", false)
    .in("parent_id", parentIds)
    .order("ordem", { ascending: true });
  if (errSub) {
    console.error("[copyPending sub]", errSub);
    return { ok: false, message: errSub.message };
  }

  const { data: max } = await supabase
    .from("tarefas_semanais")
    .select("ordem")
    .eq("semana", cur)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrdem = (max?.ordem ?? -1) + 1;

  // Insere as tarefas-pai e recupera os novos ids (na mesma ordem do input) pra
  // religar as subtarefas.
  const parentRows = pendentes.map((p) => ({
    semana: cur,
    texto: p.texto,
    observacoes: p.observacoes,
    categoria_id: p.categoria_id,
    prioridade: p.prioridade,
    prazo: p.prazo,
    stand_by: p.stand_by,
    ordem: nextOrdem++,
  }));
  const { data: inseridas, error: errInsert } = await supabase
    .from("tarefas_semanais")
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
          semana: cur,
          texto: s.texto,
          observacoes: s.observacoes,
          categoria_id: s.categoria_id,
          prioridade: s.prioridade,
          prazo: s.prazo,
          stand_by: s.stand_by,
          ordem: s.ordem,
          parent_id: novoParent,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (subRows.length > 0) {
      const { error: errSubInsert } = await supabase
        .from("tarefas_semanais")
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
