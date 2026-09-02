"use server";

import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session";
import type {
  VendaCanalPagamento,
  VendaResponsavel,
  VendaStatus,
} from "@/lib/database.types";

export type VendaActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export interface VendaInput {
  cliente: string;
  valor_unitario: number;
  quantidade: number;
  /** Desconto em R$ (não %). Coluna `desconto` NOT NULL default 0 no banco. */
  desconto?: number;
  status?: VendaStatus;
  canal_pagamento?: VendaCanalPagamento | null;
  data_venda?: string;
  observacoes?: string | null;
  lead_id?: string | null;
  /**
   * `vendas.responsavel` é NOT NULL sem default no banco (migration 0007) e
   * obrigatório no VendaInsert. Não estava no escopo de input desta fatia;
   * default 'gabriel' (app single-user). Uma fatia de UI futura deve expor.
   */
  responsavel?: VendaResponsavel;
}

/**
 * Monta o payload de escrita. NÃO inclui user_id (default auth.uid() no banco)
 * nem as colunas geradas (valor_bruto/valor_liquido/comissao_valor —
 * read-only via PostgREST). `data_venda` ausente → default current_date.
 */
function buildVendaPayload(input: VendaInput) {
  return {
    cliente: input.cliente.trim(),
    valor_unitario: input.valor_unitario,
    quantidade: input.quantidade,
    desconto: input.desconto ?? 0,
    responsavel: input.responsavel ?? "gabriel",
    status: input.status ?? "pendente",
    canal_pagamento: input.canal_pagamento ?? null,
    data_venda: input.data_venda ?? undefined,
    observacoes: input.observacoes ?? null,
    lead_id: input.lead_id ?? null,
  };
}

function validate(input: VendaInput): string | null {
  if (!input.cliente || !input.cliente.trim()) return "Cliente é obrigatório.";
  if (!(input.valor_unitario >= 0)) return "Valor unitário inválido.";
  if (!(input.quantidade > 0)) return "Quantidade deve ser maior que zero.";
  return null;
}

/**
 * CREATE — insere uma venda. Retorna o id em sucesso.
 */
export async function createVenda(
  input: VendaInput,
): Promise<VendaActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("vendas")
    .insert(buildVendaPayload(input))
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createVenda]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar venda" };
  }

  revalidatePath("/vendas");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

/**
 * UPDATE — atualiza uma venda existente.
 */
export async function updateVenda(
  id: string,
  input: VendaInput,
): Promise<VendaActionResult> {
  if (!id) return { ok: false, message: "ID ausente" };

  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const supabase = createSessionClient();
  const { error } = await supabase
    .from("vendas")
    .update(buildVendaPayload(input))
    .eq("id", id);

  if (error) {
    console.error("[updateVenda]", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/vendas");
  revalidatePath("/");
  return { ok: true, id };
}

/**
 * DELETE — remove uma venda.
 */
export async function deleteVenda(id: string): Promise<VendaActionResult> {
  if (!id) return { ok: false, message: "ID ausente" };

  const supabase = createSessionClient();
  const { error } = await supabase.from("vendas").delete().eq("id", id);

  if (error) {
    console.error("[deleteVenda]", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/vendas");
  revalidatePath("/");
  return { ok: true, id };
}
