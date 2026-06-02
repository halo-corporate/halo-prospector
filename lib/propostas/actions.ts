"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PROPOSTA_STATUSES,
  VENDA_RESPONSAVEIS,
  type PropostaStatus,
  type VendaResponsavel,
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

// ────────────────────────────────────────────────────────────────────────────
// CONVERTER EM VENDA — fluxo principal da Entrega 3
// ────────────────────────────────────────────────────────────────────────────

const responsavelEnum = z.enum(
  [...VENDA_RESPONSAVEIS] as [VendaResponsavel, ...VendaResponsavel[]],
);
const comissaoSchema = numericInput.refine(
  (n) => n >= 0 && n <= 100,
  "Comissão entre 0 e 100",
);

export type ConvertResult =
  | { ok: true; vendaId: string; propostaId: string }
  | { ok: false; message: string };

/**
 * Converte a proposta numa venda nova no /financeiro.
 *
 *  - Cria a venda copiando cliente/quantidade/valor_unitario da proposta.
 *  - O responsavel e a comissão % vêm dos args (a UI pergunta no modal).
 *  - status da venda começa como "pendente" (recém-criada, não tem
 *    pagamento ainda).
 *  - Marca a proposta como convertido + venda_id = nova venda.
 *  - data_resposta = today se não estava preenchida.
 *
 * Se algo falha na metade, tenta reverter (rollback manual — Supabase
 * não tem transação multi-table via REST API).
 */
export async function convertPropostaToVendaAction(
  propostaId: string,
  responsavel: string,
  comissaoPercentual: string | number,
): Promise<ConvertResult> {
  if (!propostaId || propostaId.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const resp = responsavelEnum.safeParse(responsavel);
  if (!resp.success) return { ok: false, message: "Responsável inválido" };
  const pct = comissaoSchema.safeParse(comissaoPercentual);
  if (!pct.success)
    return { ok: false, message: pct.error.issues[0]!.message };

  const supabase = createClient();

  // 1) Carrega a proposta (e confirma ownership via RLS)
  const { data: proposta, error: errFetch } = await supabase
    .from("propostas")
    .select("*")
    .eq("id", propostaId)
    .maybeSingle();
  if (errFetch || !proposta) {
    return { ok: false, message: "Proposta não encontrada" };
  }
  if (proposta.status === "convertido" && proposta.venda_id) {
    return {
      ok: false,
      message: "Proposta já convertida.",
    };
  }

  // 2) Cria a venda
  const today = new Date().toISOString().slice(0, 10);
  const { data: novaVenda, error: errInsert } = await supabase
    .from("vendas")
    .insert({
      data_venda: today,
      cliente: proposta.cliente,
      lead_id: proposta.lead_id,
      quantidade: proposta.quantidade,
      valor_unitario: proposta.valor_unitario,
      desconto: 0,
      responsavel: resp.data,
      comissao_percentual: pct.data,
      status: "pendente",
      observacoes: `Convertida da proposta "${proposta.titulo}"`,
    })
    .select("id")
    .single();

  if (errInsert || !novaVenda) {
    console.error("[convertPropostaToVendaAction insert venda]", errInsert);
    return {
      ok: false,
      message: errInsert?.message ?? "Erro ao criar venda",
    };
  }

  // 3) Atualiza a proposta com link + status
  const { error: errUpdate } = await supabase
    .from("propostas")
    .update({
      status: "convertido",
      venda_id: novaVenda.id,
      data_resposta: proposta.data_resposta ?? today,
    })
    .eq("id", propostaId);

  if (errUpdate) {
    // Tenta reverter a venda criada pra não ficar lixo
    await supabase.from("vendas").delete().eq("id", novaVenda.id);
    console.error("[convertPropostaToVendaAction update proposta]", errUpdate);
    return { ok: false, message: errUpdate.message };
  }

  revalidatePath("/propostas");
  revalidatePath("/financeiro");
  return { ok: true, vendaId: novaVenda.id, propostaId };
}
