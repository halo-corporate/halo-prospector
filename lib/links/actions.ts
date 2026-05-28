"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LINK_TIPOS, type LinkTipo } from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

/**
 * Normaliza URL: se vier sem protocolo, prepende https://. Mantém raw
 * caso a URL já tenha esquema (http:, https:, mailto:, tel:, ftp:, etc.).
 */
function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return `https://${t}`;
}

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL obrigatória")
  .max(2000, "URL muito longa")
  .transform(normalizeUrl)
  .refine(
    (v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "URL inválida" },
  );

const tipoSchema = z
  .enum([...LINK_TIPOS] as [LinkTipo, ...LinkTipo[]])
  .default("outro");

const linkSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(60, "Máx 60 caracteres"),
  url: urlSchema,
  descricao: z.preprocess(
    emptyToNull,
    z.string().max(200, "Máx 200 caracteres").nullable().optional(),
  ),
  tipo: tipoSchema,
});

export type LinkActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    titulo: (fd.get("titulo") ?? "") as string,
    url: (fd.get("url") ?? "") as string,
    descricao: fd.get("descricao"),
    tipo: ((fd.get("tipo") ?? "outro") as string) as LinkTipo,
  };
}

/**
 * CREATE — Cria um link novo. `ordem` é o próximo inteiro depois da maior.
 */
export async function createLinkAction(
  fd: FormData,
): Promise<LinkActionResult> {
  const parsed = linkSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();

  // Próximo `ordem` baseado no maior existente
  const { data: max } = await supabase
    .from("links")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (max?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("links")
    .insert({
      titulo: parsed.data.titulo,
      url: parsed.data.url,
      descricao: parsed.data.descricao ?? null,
      tipo: parsed.data.tipo,
      ordem: nextOrdem,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createLinkAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar link" };
  }
  revalidatePath("/links");
  return { ok: true, id: data.id };
}

/**
 * UPDATE — Atualiza um link existente.
 */
export async function updateLinkAction(
  id: string,
  fd: FormData,
): Promise<LinkActionResult> {
  if (!id || id.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const parsed = linkSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("links")
    .update({
      titulo: parsed.data.titulo,
      url: parsed.data.url,
      descricao: parsed.data.descricao ?? null,
      tipo: parsed.data.tipo,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateLinkAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/links");
  return { ok: true, id };
}

/**
 * DELETE — Remove um link.
 */
export async function deleteLinkAction(id: string): Promise<LinkActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) {
    console.error("[deleteLinkAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/links");
  return { ok: true };
}
