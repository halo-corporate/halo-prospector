"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PAGAMENTO_STATUSES,
  PAGAMENTO_TIPOS,
  type PagamentoStatus,
  type PagamentoTipo,
} from "@/lib/database.types";
import { todayBRISO } from "@/lib/timezone";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max).nullable().optional(),
  );

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .nullable()
    .optional(),
);

const valorSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/\./g, "").replace(",", ".").trim();
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : NaN;
    }
    return v;
  },
  z.number().nonnegative("Valor inválido"),
);

const pagamentoSchema = z
  .object({
    influencer_id: z.string().uuid("Influencer inválido"),
    tipo: z.enum(
      [...PAGAMENTO_TIPOS] as [PagamentoTipo, ...PagamentoTipo[]],
    ),
    valor: valorSchema,
    descricao_permuta: optionalText(500),
    data_combinada: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    data_pago: optionalDate,
    status: z.enum(
      [...PAGAMENTO_STATUSES] as [PagamentoStatus, ...PagamentoStatus[]],
    ),
    observacoes: optionalText(1000),
  })
  .refine(
    (d) => {
      // Permuta exige descrição; pago exige valor > 0 (mesma check do DB)
      if (d.tipo === "permuta") {
        return !!d.descricao_permuta && d.descricao_permuta.trim().length > 0;
      }
      return d.valor > 0;
    },
    {
      message:
        "Permuta exige descrição; pago em R$ exige valor > 0",
      path: ["valor"],
    },
  );

export type PagamentoActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    influencer_id: fd.get("influencer_id"),
    tipo: ((fd.get("tipo") ?? "permuta") as string) as PagamentoTipo,
    valor: fd.get("valor"),
    descricao_permuta: fd.get("descricao_permuta"),
    data_combinada: (fd.get("data_combinada") ?? "") as string,
    data_pago: fd.get("data_pago"),
    status: ((fd.get("status") ?? "pendente") as string) as PagamentoStatus,
    observacoes: fd.get("observacoes"),
  };
}

function buildPayload(parsed: z.infer<typeof pagamentoSchema>) {
  return {
    influencer_id: parsed.influencer_id,
    tipo: parsed.tipo,
    valor: parsed.valor,
    descricao_permuta: parsed.descricao_permuta ?? null,
    data_combinada: parsed.data_combinada,
    data_pago: parsed.data_pago ?? null,
    status: parsed.status,
    observacoes: parsed.observacoes ?? null,
  };
}

export async function createPagamentoAction(
  fd: FormData,
): Promise<PagamentoActionResult> {
  const parsed = pagamentoSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencer_pagamentos")
    .insert(buildPayload(parsed.data))
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createPagamentoAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar pagamento" };
  }
  revalidatePath(`/influencers/${parsed.data.influencer_id}`);
  return { ok: true, id: data.id };
}

export async function updatePagamentoAction(
  id: string,
  fd: FormData,
): Promise<PagamentoActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = pagamentoSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("influencer_pagamentos")
    .update(buildPayload(parsed.data))
    .eq("id", id);
  if (error) {
    console.error("[updatePagamentoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${parsed.data.influencer_id}`);
  return { ok: true, id };
}

export async function deletePagamentoAction(
  id: string,
  influencerId: string,
): Promise<PagamentoActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase
    .from("influencer_pagamentos")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deletePagamentoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${influencerId}`);
  return { ok: true };
}

export async function markPagamentoPagoAction(
  id: string,
  influencerId: string,
): Promise<PagamentoActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const today = todayBRISO();
  const supabase = createClient();
  const { error } = await supabase
    .from("influencer_pagamentos")
    .update({ status: "pago", data_pago: today })
    .eq("id", id);
  if (error) {
    console.error("[markPagamentoPagoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${influencerId}`);
  return { ok: true, id };
}
