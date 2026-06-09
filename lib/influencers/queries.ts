import { createClient } from "@/lib/supabase/server";
import type {
  Influencer,
  InfluencerContratoTipo,
  InfluencerStatus,
} from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListInfluencersFilters {
  status?: InfluencerStatus;
  contratoTipo?: InfluencerContratoTipo;
  q?: string; // busca nome ou handle
  nicho?: string;
}

export async function listInfluencers(
  filters: ListInfluencersFilters = {},
): Promise<Influencer[]> {
  const supabase = createClient();
  let query = supabase
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.contratoTipo)
    query = query.eq("contrato_tipo", filters.contratoTipo);
  if (filters.nicho && filters.nicho.trim())
    query = query.ilike("nicho", `%${filters.nicho.trim()}%`);

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    query = query.or(
      `nome.ilike.%${q}%,handle_instagram.ilike.%${q}%,handle_tiktok.ilike.%${q}%,handle_youtube.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listInfluencers] Tabela `influencers` não existe — rode a migration 0011.",
      );
      return [];
    }
    console.error("[listInfluencers]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getInfluencerById(
  id: string,
): Promise<Influencer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getInfluencerById]", error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * KPIs do dashboard V3 — influencers ativos + soma de posts publicados.
 *
 * - parceriasAtivas: status in (kit_enviado, postou, parceria_ativa)
 * - postsPublicados: soma do array_length(posts_url) em todos os influencers
 */
export async function countInfluencersV3Buckets(): Promise<{
  parceriasAtivas: number;
  postsPublicados: number;
}> {
  const empty = { parceriasAtivas: 0, postsPublicados: 0 };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("status, posts_url");
  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[countInfluencersV3Buckets]", error);
    }
    return empty;
  }
  let parceriasAtivas = 0;
  let postsPublicados = 0;
  for (const row of data ?? []) {
    if (
      row.status === "kit_enviado" ||
      row.status === "postou" ||
      row.status === "parceria_ativa"
    ) {
      parceriasAtivas++;
    }
    if (Array.isArray(row.posts_url)) {
      postsPublicados += row.posts_url.length;
    }
  }
  return { parceriasAtivas, postsPublicados };
}

/** Lista compacta para usar em selects (envios, vinculação). */
export async function listInfluencersForSelect(): Promise<
  Pick<Influencer, "id" | "nome">[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencers")
    .select("id, nome")
    .order("nome", { ascending: true });
  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[listInfluencersForSelect]", error);
    }
    return [];
  }
  return data ?? [];
}
