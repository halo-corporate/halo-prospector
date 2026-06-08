"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const dimensoesSchema = z
  .object({
    altura: z.coerce.number().positive().optional(),
    largura: z.coerce.number().positive().optional(),
    comprimento: z.coerce.number().positive().optional(),
  })
  .optional()
  .nullable();

const embalagemSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(80, "Máx 80 caracteres"),
  descricao: z
    .string()
    .trim()
    .max(500, "Máx 500 caracteres")
    .optional()
    .nullable(),
  ativo: z.boolean().optional(),
  peso_g_padrao: z.coerce
    .number()
    .int("Peso deve ser inteiro (gramas)")
    .positive("Peso > 0")
    .optional()
    .nullable(),
  dimensoes_cm_padrao: dimensoesSchema,
});

export type EmbalagemActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function emptyToNull<T>(v: T): T | null {
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function parseDimensoesFromForm(fd: FormData) {
  const altura = fd.get("dim_altura");
  const largura = fd.get("dim_largura");
  const comprimento = fd.get("dim_comprimento");
  const all = [altura, largura, comprimento];
  if (all.every((v) => v === null || v === "")) return null;
  return {
    altura: altura ? Number(altura) : undefined,
    largura: largura ? Number(largura) : undefined,
    comprimento: comprimento ? Number(comprimento) : undefined,
  };
}

function parseFormData(fd: FormData) {
  return {
    nome: ((fd.get("nome") ?? "") as string).trim(),
    descricao: emptyToNull(fd.get("descricao") as string | null),
    ativo: fd.get("ativo") === "on" || fd.get("ativo") === "true",
    peso_g_padrao: emptyToNull(fd.get("peso_g_padrao") as string | null),
    dimensoes_cm_padrao: parseDimensoesFromForm(fd),
  };
}

export async function createEmbalagemAction(
  fd: FormData,
): Promise<EmbalagemActionResult> {
  const parsed = embalagemSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("embalagens")
    .insert({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      ativo: parsed.data.ativo ?? true,
      peso_g_padrao: parsed.data.peso_g_padrao ?? null,
      dimensoes_cm_padrao: parsed.data.dimensoes_cm_padrao ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, message: "Já existe embalagem com esse nome." };
    }
    console.error("[createEmbalagemAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar embalagem" };
  }
  revalidatePath("/envios");
  return { ok: true, id: data.id };
}

export async function updateEmbalagemAction(
  id: string,
  fd: FormData,
): Promise<EmbalagemActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = embalagemSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("embalagens")
    .update({
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      ativo: parsed.data.ativo ?? true,
      peso_g_padrao: parsed.data.peso_g_padrao ?? null,
      dimensoes_cm_padrao: parsed.data.dimensoes_cm_padrao ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Já existe embalagem com esse nome." };
    }
    console.error("[updateEmbalagemAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true, id };
}

export async function deleteEmbalagemAction(
  id: string,
): Promise<EmbalagemActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("embalagens").delete().eq("id", id);
  if (error) {
    console.error("[deleteEmbalagemAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true };
}

/** Inline-create usado pelo embalagem-select ("+ Nova embalagem"). */
export async function createEmbalagemQuickAction(
  rawNome: string,
): Promise<EmbalagemActionResult & { nome?: string }> {
  const nome = (rawNome ?? "").trim();
  if (!nome || nome.length > 80) {
    return { ok: false, message: "Nome inválido (1–80 caracteres)" };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("embalagens")
    .insert({ nome })
    .select("id, nome")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("embalagens")
        .select("id, nome")
        .eq("nome", nome)
        .maybeSingle();
      if (existing) {
        revalidatePath("/envios");
        return { ok: true, id: existing.id, nome: existing.nome };
      }
    }
    console.error("[createEmbalagemQuickAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true, id: data.id, nome: data.nome };
}
