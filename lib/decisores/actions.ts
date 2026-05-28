"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DecisorPrioridade } from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;
const optStr = z.preprocess(emptyToNull, z.string().nullable().optional());

const prioridadeEnum = z.enum(["d1", "d2", "d3"]);

const decisorSchema = z.object({
  lead_id: z.string().uuid("Lead inválido"),
  nome: z.string().trim().min(1, "Nome obrigatório"),
  cargo: optStr,
  telefone: optStr,
  email: z.preprocess(
    emptyToNull,
    z.string().email("E-mail inválido").nullable().optional(),
  ),
  instagram: optStr,
  prioridade: prioridadeEnum.default("d1"),
});

export type DecisorActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    lead_id: fd.get("lead_id"),
    nome: fd.get("nome"),
    cargo: fd.get("cargo"),
    telefone: fd.get("telefone"),
    email: fd.get("email"),
    instagram: fd.get("instagram"),
    prioridade: fd.get("prioridade") || "d1",
  };
}

export async function createDecisorAction(
  fd: FormData,
): Promise<DecisorActionResult> {
  const parsed = decisorSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisores")
    .insert({
      lead_id: parsed.data.lead_id,
      nome: parsed.data.nome,
      cargo: parsed.data.cargo ?? null,
      telefone: parsed.data.telefone ?? null,
      email: parsed.data.email ?? null,
      instagram: parsed.data.instagram ?? null,
      prioridade: parsed.data.prioridade,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createDecisorAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar decisor" };
  }
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  revalidatePath("/leads");
  return { ok: true, id: data.id };
}

export async function updateDecisorAction(
  id: string,
  fields: {
    nome?: string;
    cargo?: string | null;
    telefone?: string | null;
    email?: string | null;
    instagram?: string | null;
    prioridade?: DecisorPrioridade;
    contatado?: boolean;
  },
  leadId: string,
): Promise<DecisorActionResult> {
  if (!id || !leadId) return { ok: false, message: "ID ausente" };

  const cleaned: Record<string, unknown> = {};
  if (fields.nome !== undefined) {
    const t = fields.nome.trim();
    if (!t) return { ok: false, message: "Nome não pode ficar vazio" };
    cleaned.nome = t;
  }
  if (fields.cargo !== undefined) cleaned.cargo = fields.cargo || null;
  if (fields.telefone !== undefined) cleaned.telefone = fields.telefone || null;
  if (fields.email !== undefined) {
    const e = (fields.email ?? "").trim();
    if (e) {
      const r = z.string().email().safeParse(e);
      if (!r.success) return { ok: false, message: "E-mail inválido" };
    }
    cleaned.email = e || null;
  }
  if (fields.instagram !== undefined) cleaned.instagram = fields.instagram || null;
  if (fields.prioridade !== undefined) cleaned.prioridade = fields.prioridade;
  if (fields.contatado !== undefined) cleaned.contatado = fields.contatado;

  const supabase = createClient();
  const { error } = await supabase.from("decisores").update(cleaned).eq("id", id);
  if (error) {
    console.error("[updateDecisorAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true, id };
}

export async function deleteDecisorAction(
  id: string,
  leadId: string,
): Promise<DecisorActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("decisores").delete().eq("id", id);
  if (error) {
    console.error("[deleteDecisorAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}
