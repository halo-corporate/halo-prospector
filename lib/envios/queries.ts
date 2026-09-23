import { formatInTimeZone } from "date-fns-tz";
import { createSessionClient } from "@/lib/supabase/session";
import type { Envio, EnvioStatus } from "@/lib/database.types";
import { BR_TZ } from "@/lib/timezone";

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
  const supabase = createSessionClient();
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
  const supabase = createSessionClient();
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

/**
 * Conta envios por proposta_id (filtra proposta_ids passados).
 * Usado no card de proposta pra mostrar badge "N envios".
 */
export async function countEnviosByPropostaIds(
  propostaIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (propostaIds.length === 0) return result;
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("envios")
    .select("proposta_id")
    .in("proposta_id", propostaIds);
  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[countEnviosByPropostaIds]", error);
    }
    return result;
  }
  for (const row of data ?? []) {
    if (!row.proposta_id) continue;
    result.set(row.proposta_id, (result.get(row.proposta_id) ?? 0) + 1);
  }
  return result;
}

/**
 * KPIs do dashboard V3 — buckets de envios + kits influencer.
 *
 * - aDespachar: status = a_despachar (precisa de ação)
 * - emTransito: status in (postado, em_transito)
 * - entreguesMes: status = entregue + data_entrega_efetiva no mês corrente BR
 * - kitsInfluencer: envios com influencer_id NOT NULL
 *
 * Usa intervalo `[mes_inicio, prox_mes_inicio)` em BR; coluna `data_entrega_efetiva`
 * é DATE (sem fuso), então comparação direta com yyyy-MM-dd em BR está correta.
 */
export async function countEnviosV3Buckets(): Promise<{
  aDespachar: number;
  emTransito: number;
  entreguesMes: number;
  kitsInfluencer: number;
}> {
  const empty = {
    aDespachar: 0,
    emTransito: 0,
    entreguesMes: 0,
    kitsInfluencer: 0,
  };
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("envios")
    .select("status, influencer_id, data_entrega_efetiva");
  if (error) {
    if (!isMissingTableError(error)) {
      console.error("[countEnviosV3Buckets]", error);
    }
    return empty;
  }
  // Mês corrente em fuso BR para filtrar `data_entrega_efetiva` (DATE).
  const yearMonthBR = formatInTimeZone(new Date(), BR_TZ, "yyyy-MM");

  let aDespachar = 0;
  let emTransito = 0;
  let entreguesMes = 0;
  let kitsInfluencer = 0;
  for (const row of data ?? []) {
    if (row.status === "a_despachar") aDespachar++;
    if (row.status === "postado" || row.status === "em_transito") emTransito++;
    if (
      row.status === "entregue" &&
      typeof row.data_entrega_efetiva === "string" &&
      row.data_entrega_efetiva.startsWith(yearMonthBR)
    ) {
      entreguesMes++;
    }
    if (row.influencer_id) kitsInfluencer++;
  }
  return { aDespachar, emTransito, entreguesMes, kitsInfluencer };
}

/** Contagem por status — usado no dashboard / cards de KPI. */
export async function countEnviosByStatus(): Promise<
  Record<EnvioStatus, number>
> {
  const supabase = createSessionClient();
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
