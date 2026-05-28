"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  VENDA_CANAIS_PAGAMENTO,
  VENDA_RESPONSAVEIS,
  VENDA_STATUSES,
  type VendaCanalPagamento,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

// Aceita string ("1500,50" ou "1500.50") e devolve number.
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

const vendaSchema = z.object({
  data_venda: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),
  cliente: z
    .string()
    .trim()
    .min(1, "Cliente obrigatório")
    .max(200, "Máx 200 caracteres"),
  lead_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Lead inválido").nullable().optional(),
  ),
  quantidade: intInput.refine((n) => n > 0, "Quantidade deve ser > 0"),
  valor_unitario: numericInput.refine((n) => n >= 0, "Valor inválido"),
  desconto: numericInput.refine((n) => n >= 0, "Desconto inválido"),
  responsavel: z.enum(
    [...VENDA_RESPONSAVEIS] as [VendaResponsavel, ...VendaResponsavel[]],
  ),
  comissao_percentual: numericInput
    .refine((n) => n >= 0 && n <= 100, "Comissão entre 0 e 100"),
  comissao_paga: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.boolean(),
  ),
  canal_pagamento: z.preprocess(
    emptyToNull,
    z
      .enum(
        [...VENDA_CANAIS_PAGAMENTO] as [
          VendaCanalPagamento,
          ...VendaCanalPagamento[],
        ],
      )
      .nullable()
      .optional(),
  ),
  status: z.enum(
    [...VENDA_STATUSES] as [VendaStatus, ...VendaStatus[]],
  ),
  data_pagamento: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .optional(),
  ),
  observacoes: z.preprocess(
    emptyToNull,
    z.string().max(2000, "Máx 2000 caracteres").nullable().optional(),
  ),
});

export type VendaActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseFormData(fd: FormData) {
  return {
    data_venda: (fd.get("data_venda") ?? "") as string,
    cliente: (fd.get("cliente") ?? "") as string,
    lead_id: fd.get("lead_id"),
    quantidade: fd.get("quantidade"),
    valor_unitario: fd.get("valor_unitario"),
    desconto: fd.get("desconto") ?? 0,
    responsavel: ((fd.get("responsavel") ?? "gabriel") as string) as VendaResponsavel,
    comissao_percentual: fd.get("comissao_percentual") ?? 10,
    comissao_paga: fd.get("comissao_paga"),
    canal_pagamento: fd.get("canal_pagamento"),
    status: ((fd.get("status") ?? "pendente") as string) as VendaStatus,
    data_pagamento: fd.get("data_pagamento"),
    observacoes: fd.get("observacoes"),
  };
}

export async function createVendaAction(
  fd: FormData,
): Promise<VendaActionResult> {
  const parsed = vendaSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vendas")
    .insert({
      data_venda: parsed.data.data_venda,
      cliente: parsed.data.cliente,
      lead_id: parsed.data.lead_id ?? null,
      quantidade: parsed.data.quantidade,
      valor_unitario: parsed.data.valor_unitario,
      desconto: parsed.data.desconto,
      responsavel: parsed.data.responsavel,
      comissao_percentual: parsed.data.comissao_percentual,
      comissao_paga: parsed.data.comissao_paga,
      canal_pagamento: parsed.data.canal_pagamento ?? null,
      status: parsed.data.status,
      data_pagamento: parsed.data.data_pagamento ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createVendaAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar venda" };
  }
  revalidatePath("/financeiro");
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
  const supabase = createClient();
  const { error } = await supabase
    .from("vendas")
    .update({
      data_venda: parsed.data.data_venda,
      cliente: parsed.data.cliente,
      lead_id: parsed.data.lead_id ?? null,
      quantidade: parsed.data.quantidade,
      valor_unitario: parsed.data.valor_unitario,
      desconto: parsed.data.desconto,
      responsavel: parsed.data.responsavel,
      comissao_percentual: parsed.data.comissao_percentual,
      comissao_paga: parsed.data.comissao_paga,
      canal_pagamento: parsed.data.canal_pagamento ?? null,
      status: parsed.data.status,
      data_pagamento: parsed.data.data_pagamento ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateVendaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/financeiro");
  return { ok: true, id };
}

export async function deleteVendaAction(
  id: string,
): Promise<VendaActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("vendas").delete().eq("id", id);
  if (error) {
    console.error("[deleteVendaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/financeiro");
  return { ok: true };
}
