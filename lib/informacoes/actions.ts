"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

/** Normaliza string livre pra slug snake_case. */
function toSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** Aceita CSV ou array, devolve slugs únicos, ≥1. */
const categoriasFromCsv = z.preprocess(
  (v) => {
    const arr = Array.isArray(v)
      ? v
      : typeof v === "string"
        ? v.split(",")
        : [];
    const slugs = arr
      .map((s) => (typeof s === "string" ? toSlug(s) : ""))
      .filter((s) => s.length > 0);
    return Array.from(new Set(slugs));
  },
  z.array(z.string().min(1).max(40)).min(1, "Selecione ao menos 1 categoria"),
);

const informacaoSchema = z.object({
  categorias: categoriasFromCsv,
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
    categorias: fd.get("categorias") ?? "",
    titulo: (fd.get("titulo") ?? "") as string,
    valor: (fd.get("valor") ?? "") as string,
    valor_secreto: fd.get("valor_secreto"),
    observacoes: fd.get("observacoes"),
  };
}

/**
 * Escreve tanto a coluna escalar antiga (categoria = categorias[0]) quanto
 * a array nova. Migration 0011 dropa a antiga depois.
 */
function buildPayload(parsed: z.infer<typeof informacaoSchema>) {
  return {
    categoria: parsed.categorias[0]!,
    categorias: parsed.categorias,
    titulo: parsed.titulo,
    valor: parsed.valor,
    valor_secreto: parsed.valor_secreto ?? null,
    observacoes: parsed.observacoes ?? null,
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

  // Ordem por primeira categoria (mantém agrupamento da UI atual coerente).
  const { data: max } = await supabase
    .from("informacoes")
    .select("ordem")
    .eq("categoria", parsed.data.categorias[0]!)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("informacoes")
    .insert({
      ...buildPayload(parsed.data),
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
    .update(buildPayload(parsed.data))
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
