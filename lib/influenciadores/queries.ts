import { createSessionClient } from "@/lib/supabase/session";
import type {
  Influencer,
  InfluencerPagamento,
  InfluencerVenda,
} from "@/lib/database.types";

export async function listInfluencers(): Promise<Influencer[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInfluencers]", error);
    throw new Error(`Falha ao buscar influenciadores: ${error.message}`);
  }
  return data ?? [];
}

export async function getInfluencerById(id: string): Promise<Influencer | null> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getInfluencerById]", error);
    throw new Error(`Falha ao buscar influenciador: ${error.message}`);
  }
  return data;
}

export async function listPagamentosByInfluencer(
  influencerId: string,
): Promise<InfluencerPagamento[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("influencer_pagamentos")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("data_combinada", { ascending: false });

  if (error) {
    console.error("[listPagamentosByInfluencer]", error);
    return [];
  }
  return data ?? [];
}

export async function listVendasByInfluencer(
  influencerId: string,
): Promise<InfluencerVenda[]> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("influencer_vendas")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("data_venda", { ascending: false });

  if (error) {
    console.error("[listVendasByInfluencer]", error);
    return [];
  }
  return data ?? [];
}
