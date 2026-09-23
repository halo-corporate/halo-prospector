"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { MENSAGEM_CANAIS, type MensagemCanal } from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const canalEnum = z.enum([...MENSAGEM_CANAIS] as [MensagemCanal, ...MensagemCanal[]]);

/** Aceita FormData onde "canais" vem como CSV "whatsapp,email". */
const canaisFromCsv = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v !== "string") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  z.array(canalEnum).min(1, "Selecione ao menos 1 canal"),
);

/** Etapas: array livre de slugs (lead_status ou customizado), pode ser vazio. */
const etapasFromCsv = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v !== "string" || v.trim() === "") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  z.array(z.string().trim().min(1).max(60)),
);

const templateSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(100, "Máx 100 caracteres"),
  canais: canaisFromCsv,
  etapas_funil: etapasFromCsv,
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
    canais: fd.get("canais") ?? "",
    etapas_funil: fd.get("etapas_funil") ?? "",
    assunto: fd.get("assunto"),
    corpo: (fd.get("corpo") ?? "") as string,
  };
}

/**
 * Durante a transição (migration 0010 add, 0011 drop), escrevemos tanto as
 * colunas array novas quanto as escalares antigas (canal/etapa_funil), pra
 * manter compat com qualquer caminho que ainda leia o escalar. Depois do
 * drop, basta remover os campos `canal` e `etapa_funil` daqui.
 */
function buildPayload(parsed: z.infer<typeof templateSchema>) {
  return {
    titulo: parsed.titulo,
    canal: parsed.canais[0]!, // legado: NOT NULL no banco
    canais: parsed.canais,
    etapa_funil: parsed.etapas_funil[0] ?? null,
    etapas_funil: parsed.etapas_funil.length > 0 ? parsed.etapas_funil : null,
    assunto: parsed.assunto ?? null,
    corpo: parsed.corpo,
  };
}

export async function createTemplateAction(
  fd: FormData,
): Promise<TemplateActionResult> {
  const parsed = templateSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createSessionClient();

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
      ...buildPayload(parsed.data),
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
  const supabase = createSessionClient();
  const { error } = await supabase
    .from("mensagem_templates")
    .update(buildPayload(parsed.data))
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
  const supabase = createSessionClient();
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
