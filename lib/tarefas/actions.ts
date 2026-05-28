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
 * Alterna a flag `concluida`. Também grava `concluida_em` (timestamptz).
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

  const { data: pendentes, error: errFetch } = await supabase
    .from("tarefas_semanais")
    .select("texto, ordem")
    .eq("semana", prev)
    .eq("concluida", false)
    .order("ordem", { ascending: true });
  if (errFetch) {
    console.error("[copyPending]", errFetch);
    return { ok: false, message: errFetch.message };
  }
  if (!pendentes || pendentes.length === 0) {
    return { ok: true, copied: 0 };
  }

  const { data: max } = await supabase
    .from("tarefas_semanais")
    .select("ordem")
    .eq("semana", cur)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrdem = (max?.ordem ?? -1) + 1;

  const rows = pendentes.map((p) => ({
    semana: cur,
    texto: p.texto,
    ordem: nextOrdem++,
  }));
  const { error: errInsert } = await supabase
    .from("tarefas_semanais")
    .insert(rows);
  if (errInsert) {
    console.error("[copyPending insert]", errInsert);
    return { ok: false, message: errInsert.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true, copied: rows.length };
}
