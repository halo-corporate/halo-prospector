"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PROPOSTA_STATUSES,
  type PropostaStatus,
} from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const numericInput = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/\./g, "").replace(",", ".").trim();
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : NaN;
    }
    return v;
  },
  z.number({ invalid_type_error: "Valor inválido" }),
);

const intInput = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    if (typeof v === "number") return Math.trunc(v);
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : NaN;
    }
    return v;
  },
  z.number().int(),
);

const propostaSchema = z.object({
  cliente: z
    .string()
    .trim()
    .min(1, "Cliente obrigatório")
    .max(200, "Máx 200 caracteres"),
  titulo: z
    .string()
    .trim()
    .min(1, "Título obrigatório")
    .max(200, "Máx 200 caracteres"),
  lead_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Lead inválido").nullable().optional(),
  ),
  descricao: z.preprocess(
    emptyToNull,
    z.string().max(4000, "Máx 4000 caracteres").nullable().optional(),
  ),
  quantidade: intInput.refine((n) => n > 0, "Quantidade deve ser > 0"),
  valor_unitario: numericInput.refine((n) => n >= 0, "Valor inválido"),
  status: z.enum(
    [...PROPOSTA_STATUSES] as [PropostaStatus, ...PropostaStatus[]],
  ),
  data_envio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  data_resposta: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .optional(),
  ),
  motivo_recusa: z.preprocess(
    emptyToNull,
    z.string().max(1000, "Máx 1000 caracteres").nullable().optional(),
  ),
  observacoes: z.preprocess(
    emptyToNull,
    z.string().max(2000, "Máx 2000 caracteres").nullable().optional(),
  ),
});

export type PropostaActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    cliente: (fd.get("cliente") ?? "") as string,
    titulo: (fd.get("titulo") ?? "") as string,
    lead_id: fd.get("lead_id"),
    descricao: fd.get("descricao"),
    quantidade: fd.get("quantidade") ?? 1,
    valor_unitario: fd.get("valor_unitario"),
    status: ((fd.get("status") ?? "aberto") as string) as PropostaStatus,
    data_envio: (fd.get("data_envio") ?? "") as string,
    data_resposta: fd.get("data_resposta"),
    motivo_recusa: fd.get("motivo_recusa"),
    observacoes: fd.get("observacoes"),
  };
}

export async function createPropostaAction(
  fd: FormData,
): Promise<PropostaActionResult> {
  const parsed = propostaSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("propostas")
    .insert({
      cliente: parsed.data.cliente,
      titulo: parsed.data.titulo,
      lead_id: parsed.data.lead_id ?? null,
      descricao: parsed.data.descricao ?? null,
      quantidade: parsed.data.quantidade,
      valor_unitario: parsed.data.valor_unitario,
      status: parsed.data.status,
      data_envio: parsed.data.data_envio,
      data_resposta: parsed.data.data_resposta ?? null,
      motivo_recusa: parsed.data.motivo_recusa ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createPropostaAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar proposta" };
  }
  revalidatePath("/propostas");
  return { ok: true, id: data.id };
}

export async function updatePropostaAction(
  id: string,
  fd: FormData,
): Promise<PropostaActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = propostaSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("propostas")
    .update({
      cliente: parsed.data.cliente,
      titulo: parsed.data.titulo,
      lead_id: parsed.data.lead_id ?? null,
      descricao: parsed.data.descricao ?? null,
      quantidade: parsed.data.quantidade,
      valor_unitario: parsed.data.valor_unitario,
      status: parsed.data.status,
      data_envio: parsed.data.data_envio,
      data_resposta: parsed.data.data_resposta ?? null,
      motivo_recusa: parsed.data.motivo_recusa ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updatePropostaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/propostas");
  return { ok: true, id };
}

export async function deletePropostaAction(
  id: string,
): Promise<PropostaActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("propostas").delete().eq("id", id);
  if (error) {
    console.error("[deletePropostaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/propostas");
  return { ok: true };
}

