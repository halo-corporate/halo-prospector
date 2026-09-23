"use server";

import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session";
import { z } from "zod";
import type { InfluencerInsert, InfluencerUpdate } from "@/lib/database.types";

const influencerSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  handle_instagram: z.string().optional().nullable(),
  handle_tiktok: z.string().optional().nullable(),
  handle_youtube: z.string().optional().nullable(),
  seguidores_instagram: z.number().optional().nullable(),
  seguidores_tiktok: z.number().optional().nullable(),
  seguidores_youtube: z.number().optional().nullable(),
  engajamento_pct: z.number().optional().nullable(),
  nicho: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
  status: z.enum([
    "prospeccao",
    "contatado",
    "negociando",
    "kit_enviado",
    "postou",
    "parceria_ativa",
    "encerrado",
  ]).optional(),
  contrato_tipo: z.enum(["permuta", "pago", "permuta_e_pago"]).optional().nullable(),
  valor_cache: z.number().optional().nullable(),
  codigo_promocional: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export async function createInfluencerAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const raw = {
    nome: formData.get("nome"),
    handle_instagram: formData.get("handle_instagram") || null,
    handle_tiktok: formData.get("handle_tiktok") || null,
    handle_youtube: formData.get("handle_youtube") || null,
    seguidores_instagram: formData.get("seguidores_instagram") ? Number(formData.get("seguidores_instagram")) : null,
    seguidores_tiktok: formData.get("seguidores_tiktok") ? Number(formData.get("seguidores_tiktok")) : null,
    seguidores_youtube: formData.get("seguidores_youtube") ? Number(formData.get("seguidores_youtube")) : null,
    engajamento_pct: formData.get("engajamento_pct") ? Number(formData.get("engajamento_pct")) : null,
    nicho: formData.get("nicho") || null,
    cidade: formData.get("cidade") || null,
    uf: formData.get("uf") || null,
    status: formData.get("status") || undefined,
    contrato_tipo: formData.get("contrato_tipo") || null,
    valor_cache: formData.get("valor_cache") ? Number(formData.get("valor_cache")) : null,
    codigo_promocional: formData.get("codigo_promocional") || null,
    observacoes: formData.get("observacoes") || null,
  };

  const parsed = influencerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createSessionClient();
  const insertData: InfluencerInsert = {
    ...parsed.data,
    status: parsed.data.status ?? "prospeccao",
  };

  const { data, error } = await supabase
    .from("influencers")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    console.error("[createInfluencerAction]", error);
    return { ok: false, error: `Erro ao criar influenciador: ${error.message}` };
  }

  revalidatePath("/influencers");
  return { ok: true, id: data.id };
}

export async function updateInfluencerAction(
  id: string,
  _prevState: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const raw = {
    nome: formData.get("nome"),
    handle_instagram: formData.get("handle_instagram") || null,
    handle_tiktok: formData.get("handle_tiktok") || null,
    handle_youtube: formData.get("handle_youtube") || null,
    seguidores_instagram: formData.get("seguidores_instagram") ? Number(formData.get("seguidores_instagram")) : null,
    seguidores_tiktok: formData.get("seguidores_tiktok") ? Number(formData.get("seguidores_tiktok")) : null,
    seguidores_youtube: formData.get("seguidores_youtube") ? Number(formData.get("seguidores_youtube")) : null,
    engajamento_pct: formData.get("engajamento_pct") ? Number(formData.get("engajamento_pct")) : null,
    nicho: formData.get("nicho") || null,
    cidade: formData.get("cidade") || null,
    uf: formData.get("uf") || null,
    status: formData.get("status") || undefined,
    contrato_tipo: formData.get("contrato_tipo") || null,
    valor_cache: formData.get("valor_cache") ? Number(formData.get("valor_cache")) : null,
    codigo_promocional: formData.get("codigo_promocional") || null,
    observacoes: formData.get("observacoes") || null,
  };

  const parsed = influencerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createSessionClient();
  const updateData: InfluencerUpdate = parsed.data;

  const { error } = await supabase
    .from("influencers")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("[updateInfluencerAction]", error);
    return { ok: false, error: `Erro ao atualizar influenciador: ${error.message}` };
  }

  revalidatePath("/influencers");
  revalidatePath(`/influencers/${id}`);
  return { ok: true };
}

export async function deleteInfluencerAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSessionClient();
  const { error } = await supabase
    .from("influencers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteInfluencerAction]", error);
    return { ok: false, error: `Erro ao excluir influenciador: ${error.message}` };
  }

  revalidatePath("/influencers");
  return { ok: true };
}
