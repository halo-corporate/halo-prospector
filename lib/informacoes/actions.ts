"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const categoriaSlug = z
  .string()
  .trim()
  .min(1, "Categoria obrigatória")
  .max(40, "Categoria muito longa")
  .transform((s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40),
  )
  .refine((s) => s.length >= 1, { message: "Categoria inválida" });

const informacaoSchema = z.object({
  categoria: categoriaSlug,
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(100, "Máx 100 caracteres"),
  valor: z
    .string()
    .trim()
    .min(1, "Valor obrigatório")
    .max(2000, "Máx 2000 caracteres"),
  valor_secreto: z.preprocess(
    emptyToNull,
    z.string().max(2000, "Secreto muito longo").nullable().optional(),
  ),
  observacoes: z.preprocess(
    emptyToNull,
    z.string().max(2000, "Observações muito longas").nullable().optional(),
  ),
});

export type InformacaoActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    categoria: (fd.get("categoria") ?? "") as string,
    titulo: (fd.get("titulo") ?? "") as string,
    valor: (fd.get("valor") ?? "") as string,
    valor_secreto: fd.get("valor_secreto"),
    observacoes: fd.get("observacoes"),
  };
}

export async function createInformacaoAction(
  fd: FormData,
): Promise<InformacaoActionResult> {
  const parsed = informacaoSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();

  const { data: max } = await supabase
    .from("informacoes")
    .select("ordem")
    .eq("categoria", parsed.data.categoria)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("informacoes")
    .insert({
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      valor: parsed.data.valor,
      valor_secreto: parsed.data.valor_secreto ?? null,
      observacoes: parsed.data.observacoes ?? null,
      ordem: nextOrdem,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createInformacaoAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar" };
  }
  revalidatePath("/informacoes");
  return { ok: true, id: data.id };
}

export async function updateInformacaoAction(
  id: string,
  fd: FormData,
): Promise<InformacaoActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = informacaoSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("informacoes")
    .update({
      categoria: parsed.data.categoria,
      titulo: parsed.data.titulo,
      valor: parsed.data.valor,
      valor_secreto: parsed.data.valor_secreto ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateInformacaoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/informacoes");
  return { ok: true, id };
}

export async function deleteInformacaoAction(
  id: string,
): Promise<InformacaoActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("informacoes").delete().eq("id", id);
  if (error) {
    console.error("[deleteInformacaoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/informacoes");
  return { ok: true };
}
