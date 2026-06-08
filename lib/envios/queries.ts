import { createClient } from "@/lib/supabase/server";
import type { Envio, EnvioStatus } from "@/lib/database.types";

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = err.message ?? "";
  return (
    /schema cache/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

export interface ListEnviosFilters {
  status?: EnvioStatus;
  q?: string; // busca destinatário ou rastreio
  origem?: "proposta" | "influencer" | "lead" | "avulso";
  dataInicio?: string; // yyyy-MM-dd (data_postagem)
  dataFim?: string;
}

export async function listEnvios(
  filters: ListEnviosFilters = {},
): Promise<Envio[]> {
  const supabase = createClient();
  let query = supabase
    .from("envios")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    query = query.or(
      `destinatario_nome.ilike.%${q}%,codigo_rastreio.ilike.%${q}%`,
    );
  }

  if (filters.origem === "proposta")
    query = query.not("proposta_id", "is", null);
  if (filters.origem === "influencer")
    query = query.not("influencer_id", "is", null);
  if (filters.origem === "lead") query = query.not("lead_id", "is", null);
  if (filters.origem === "avulso") {
    query = query
      .is("proposta_id", null)
      .is("influencer_id", null)
      .is("lead_id", null);
  }

  if (filters.dataInicio)
    query = query.gte("data_postagem", filters.dataInicio);
  if (filters.dataFim) query = query.lte("data_postagem", filters.dataFim);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        "[listEnvios] Tabela `envios` não existe — rode a migration 0011.",
      );
      return [];
    }
    console.error("[listEnvios]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getEnvioById(id: string): Promise<Envio | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("envios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getEnvioById]", error);
    throw new Error(error.message);
  }
  return data;
}

/** Contagem por status — usado no dashboard / cards de KPI. */
export async function countEnviosByStatus(): Promise<
  Record<EnvioStatus, number>
> {
  const supabase = createClient();
  const { data, error } = await supabase.from("envios").select("status");
  const empty: Record<EnvioStatus, number> = {
    a_despachar: 0,
    embalado: 0,
    etiquetado: 0,
    postado: 0,
    em_transito: 0,
    entregue: 0,
    devolvido: 0,
    extraviado: 0,
  };
  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[countEnviosByStatus]", error);
    }
    return empty;
  }
  for (const row of data ?? []) {
    empty[row.status as EnvioStatus] =
      (empty[row.status as EnvioStatus] ?? 0) + 1;
  }
  return empty;
}
