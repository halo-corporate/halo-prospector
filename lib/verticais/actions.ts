"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugifyVertical } from "./slug";

const newVerticalSchema = z.object({
  label: z.string().trim().min(1, "Nome obrigatório").max(60, "Máx 60 caracteres"),
});

export type CreateVerticalResult =
  | { ok: true; slug: string; label: string }
  | { ok: false; message: string };

/**
 * Cria uma nova vertical pro usuário atual. Idempotente por slug:
 * se já existe (mesmo user + mesmo slug), retorna a existente.
 */
export async function createVerticalAction(
  rawLabel: string,
): Promise<CreateVerticalResult> {
  const parsed = newVerticalSchema.safeParse({ label: rawLabel });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const label = parsed.data.label;
  const slug = slugifyVertical(label);
  if (slug.length < 2) {
    return { ok: false, message: "Nome inválido" };
  }

  const supabase = createClient();

  // Tenta inserir; se conflito de unique (user_id, slug), busca a existente.
  const { error } = await supabase
    .from("verticais")
    .insert({ slug, label, is_default: false, ordem: 100 });

  if (error && error.code !== "23505") {
    console.error("[createVerticalAction]", error);
    return { ok: false, message: error.message };
  }

  // Se aconteceu conflito, devolve a row já existente (mesmo slug).
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("verticais")
      .select("slug,label")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      revalidatePath("/crm");
      revalidatePath("/");
      return { ok: true, slug: existing.slug, label: existing.label };
    }
  }

  revalidatePath("/crm");
  revalidatePath("/");
  return { ok: true, slug, label };
}
