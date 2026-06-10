import { createClient } from "@/lib/supabase/server";
import type { InfluencerVenda } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export async function listVendasByInfluencer(
  influencerId: string,
): Promise<InfluencerVenda[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencer_vendas")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("data_venda", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[listVendasByInfluencer]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
