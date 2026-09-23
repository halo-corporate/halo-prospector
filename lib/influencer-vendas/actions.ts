"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max).nullable().optional(),
  );

const valorSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return NaN;
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

const quantidadeSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return 1;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseInt(v.trim(), 10);
      return Number.isFinite(n) ? n : NaN;
    }
    return v;
  },
  z.number().int("Quantidade deve ser inteira").min(1, "Mín 1").max(999, "Máx 999"),
);

const vendaSchema = z.object({
  influencer_id: z.string().uuid("Influencer inválido"),
  data_venda: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantidade: quantidadeSchema,
  valor_total: valorSchema,
  comprador_nome: optionalText(200),
  observacoes: optionalText(1000),
});

export type VendaActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    influencer_id: fd.get("influencer_id"),
    data_venda: (fd.get("data_venda") ?? "") as string,
    quantidade: fd.get("quantidade"),
    valor_total: fd.get("valor_total"),
    comprador_nome: fd.get("comprador_nome"),
    observacoes: fd.get("observacoes"),
  };
}

function buildPayload(parsed: z.infer<typeof vendaSchema>) {
  return {
    influencer_id: parsed.influencer_id,
    data_venda: parsed.data_venda,
    quantidade: parsed.quantidade,
    valor_total: parsed.valor_total,
    comprador_nome: parsed.comprador_nome ?? null,
    observacoes: parsed.observacoes ?? null,
  };
}

export async function createVendaAction(
  fd: FormData,
): Promise<VendaActionResult> {
  const parsed = vendaSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("influencer_vendas")
    .insert(buildPayload(parsed.data))
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createVendaAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao registrar venda" };
  }
  revalidatePath(`/influencers/${parsed.data.influencer_id}`);
  return { ok: true, id: data.id };
}

export async function updateVendaAction(
  id: string,
  fd: FormData,
): Promise<VendaActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = vendaSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createSessionClient();
  const { error } = await supabase
    .from("influencer_vendas")
    .update(buildPayload(parsed.data))
    .eq("id", id);
  if (error) {
    console.error("[updateVendaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${parsed.data.influencer_id}`);
  return { ok: true, id };
}

export async function deleteVendaAction(
  id: string,
  influencerId: string,
): Promise<VendaActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createSessionClient();
  const { error } = await supabase
    .from("influencer_vendas")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteVendaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${influencerId}`);
  return { ok: true };
}
