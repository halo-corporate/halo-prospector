"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const nomeSchema = z
  .string()
  .trim()
  .min(1, "Nome obrigatório")
  .max(40, "Máx 40 caracteres");

// Cor em hex #RRGGBB (espelha o check da migration 0018).
const corSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (use #RRGGBB)");

const idSchema = z.string().uuid("ID inválido");

export type CategoriaActionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Cria uma categoria nova. `ordem` é o próximo inteiro depois da maior já
 * existente do usuário (vai pro fim da lista).
 */
export async function createCategoriaAction(
  nome: string,
  cor: string,
): Promise<CategoriaActionResult> {
  const n = nomeSchema.safeParse(nome);
  if (!n.success) return { ok: false, message: n.error.issues[0]!.message };
  const c = corSchema.safeParse(cor);
  if (!c.success) return { ok: false, message: c.error.issues[0]!.message };

  const supabase = createClient();
  const { data: max } = await supabase
    .from("categorias_tarefa")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { error } = await supabase
    .from("categorias_tarefa")
    .insert({ nome: n.data, cor: c.data, ordem: nextOrdem });
  if (error) {
    console.error("[createCategoriaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Atualiza nome e/ou cor de uma categoria.
 */
export async function updateCategoriaAction(
  id: string,
  nome: string,
  cor: string,
): Promise<CategoriaActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return { ok: false, message: i.error.issues[0]!.message };
  const n = nomeSchema.safeParse(nome);
  if (!n.success) return { ok: false, message: n.error.issues[0]!.message };
  const c = corSchema.safeParse(cor);
  if (!c.success) return { ok: false, message: c.error.issues[0]!.message };

  const supabase = createClient();
  const { error } = await supabase
    .from("categorias_tarefa")
    .update({ nome: n.data, cor: c.data })
    .eq("id", i.data);
  if (error) {
    console.error("[updateCategoriaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Deleta uma categoria. As tarefas que a referenciam NÃO são apagadas — o FK
 * `on delete set null` apenas as desagrupa (voltam pra "Sem categoria").
 */
export async function deleteCategoriaAction(
  id: string,
): Promise<CategoriaActionResult> {
  const i = idSchema.safeParse(id);
  if (!i.success) return { ok: false, message: i.error.issues[0]!.message };

  const supabase = createClient();
  const { error } = await supabase
    .from("categorias_tarefa")
    .delete()
    .eq("id", i.data);
  if (error) {
    console.error("[deleteCategoriaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/checklist");
  revalidatePath("/");
  return { ok: true };
}
