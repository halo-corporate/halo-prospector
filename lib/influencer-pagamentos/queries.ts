import { createSessionClient } from "@/lib/supabase/session";
import type { InfluencerPagamento } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
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
    if (isMissingTableError(error)) return [];
    console.error("[listPagamentosByInfluencer]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
