"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MENSAGEM_CANAIS, type MensagemCanal } from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const canalSchema = z
  .enum([...MENSAGEM_CANAIS] as [MensagemCanal, ...MensagemCanal[]])
  .default("whatsapp");

const templateSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(100, "Máx 100 caracteres"),
  canal: canalSchema,
  etapa_funil: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .min(1)
      .max(60, "Máx 60 caracteres")
      .nullable()
      .optional(),
  ),
  assunto: z.preprocess(
    emptyToNull,
    z.string().max(200, "Máx 200 caracteres").nullable().optional(),
  ),
  corpo: z
    .string()
    .trim()
    .min(1, "Corpo obrigatório")
    .max(4000, "Máx 4000 caracteres"),
});

export type TemplateActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    titulo: (fd.get("titulo") ?? "") as string,
    canal: ((fd.get("canal") ?? "whatsapp") as string) as MensagemCanal,
    etapa_funil: fd.get("etapa_funil"),
    assunto: fd.get("assunto"),
    corpo: (fd.get("corpo") ?? "") as string,
  };
}

export async function createTemplateAction(
  fd: FormData,
): Promise<TemplateActionResult> {
  const parsed = templateSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();

  const { data: max } = await supabase
    .from("mensagem_templates")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("mensagem_templates")
    .insert({
      titulo: parsed.data.titulo,
      canal: parsed.data.canal,
      etapa_funil: parsed.data.etapa_funil ?? null,
      assunto: parsed.data.assunto ?? null,
      corpo: parsed.data.corpo,
      ordem: nextOrdem,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createTemplateAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar template" };
  }
  revalidatePath("/mensagens");
  return { ok: true, id: data.id };
}

export async function updateTemplateAction(
  id: string,
  fd: FormData,
): Promise<TemplateActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = templateSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("mensagem_templates")
    .update({
      titulo: parsed.data.titulo,
      canal: parsed.data.canal,
      etapa_funil: parsed.data.etapa_funil ?? null,
      assunto: parsed.data.assunto ?? null,
      corpo: parsed.data.corpo,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateTemplateAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/mensagens");
  return { ok: true, id };
}

export async function deleteTemplateAction(
  id: string,
): Promise<TemplateActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase
    .from("mensagem_templates")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteTemplateAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/mensagens");
  return { ok: true };
}
