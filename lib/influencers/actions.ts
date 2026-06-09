"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  INFLUENCER_STATUSES,
  INFLUENCER_CONTRATO_TIPOS,
  type InfluencerStatus,
  type InfluencerContratoTipo,
} from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number, msg = "Texto muito longo") =>
  z.preprocess(
    emptyToNull,
    z.string().max(max, msg).nullable().optional(),
  );

const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z
    .number()
    .int("Deve ser inteiro")
    .nonnegative("Deve ser >= 0")
    .nullable()
    .optional(),
);

const optionalPositiveNum = z.preprocess(
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
  z.number().nonnegative("Valor inválido").nullable().optional(),
);

const optionalPct = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const cleaned = v.replace(",", ".").trim();
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : NaN;
    }
    return v;
  },
  z
    .number()
    .min(0, "Mín 0%")
    .max(100, "Máx 100%")
    .nullable()
    .optional(),
);

const influencerSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(200, "Máx 200 caracteres"),
  handle_instagram: optionalText(100),
  handle_tiktok: optionalText(100),
  handle_youtube: optionalText(100),
  seguidores_instagram: optionalPositiveInt,
  seguidores_tiktok: optionalPositiveInt,
  seguidores_youtube: optionalPositiveInt,
  engajamento_pct: optionalPct,
  nicho: optionalText(100),
  cidade: optionalText(120),
  uf: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^[A-Za-z]{2}$/, "UF deve ter 2 letras")
      .transform((s) => s.toUpperCase())
      .nullable()
      .optional(),
  ),
  status: z.enum(
    [...INFLUENCER_STATUSES] as [InfluencerStatus, ...InfluencerStatus[]],
  ),
  contrato_tipo: z.preprocess(
    emptyToNull,
    z
      .enum(
        [...INFLUENCER_CONTRATO_TIPOS] as [
          InfluencerContratoTipo,
          ...InfluencerContratoTipo[],
        ],
      )
      .nullable()
      .optional(),
  ),
  valor_cache: optionalPositiveNum,
  alcance_total: optionalPositiveInt,
  engajamento_total: optionalPositiveInt,
  observacoes: optionalText(2000),
});

export type InfluencerActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function stripAt(v: string | null): string | null {
  if (!v) return v;
  const s = v.trim().replace(/^@+/, "");
  return s.length === 0 ? null : s;
}

function parseFormData(fd: FormData) {
  return {
    nome: ((fd.get("nome") ?? "") as string).trim(),
    handle_instagram: stripAt(fd.get("handle_instagram") as string | null),
    handle_tiktok: stripAt(fd.get("handle_tiktok") as string | null),
    handle_youtube: stripAt(fd.get("handle_youtube") as string | null),
    seguidores_instagram: fd.get("seguidores_instagram"),
    seguidores_tiktok: fd.get("seguidores_tiktok"),
    seguidores_youtube: fd.get("seguidores_youtube"),
    engajamento_pct: fd.get("engajamento_pct"),
    nicho: fd.get("nicho"),
    cidade: fd.get("cidade"),
    uf: fd.get("uf"),
    status: ((fd.get("status") ?? "prospeccao") as string) as InfluencerStatus,
    contrato_tipo: fd.get("contrato_tipo"),
    valor_cache: fd.get("valor_cache"),
    alcance_total: fd.get("alcance_total"),
    engajamento_total: fd.get("engajamento_total"),
    observacoes: fd.get("observacoes"),
  };
}

function buildPayload(parsed: z.infer<typeof influencerSchema>) {
  return {
    nome: parsed.nome,
    handle_instagram: parsed.handle_instagram ?? null,
    handle_tiktok: parsed.handle_tiktok ?? null,
    handle_youtube: parsed.handle_youtube ?? null,
    seguidores_instagram: parsed.seguidores_instagram ?? null,
    seguidores_tiktok: parsed.seguidores_tiktok ?? null,
    seguidores_youtube: parsed.seguidores_youtube ?? null,
    engajamento_pct: parsed.engajamento_pct ?? null,
    nicho: parsed.nicho ?? null,
    cidade: parsed.cidade ?? null,
    uf: parsed.uf ?? null,
    status: parsed.status,
    contrato_tipo: parsed.contrato_tipo ?? null,
    valor_cache: parsed.valor_cache ?? null,
    alcance_total: parsed.alcance_total ?? null,
    engajamento_total: parsed.engajamento_total ?? null,
    observacoes: parsed.observacoes ?? null,
  };
}

export async function createInfluencerAction(
  fd: FormData,
): Promise<InfluencerActionResult> {
  const parsed = influencerSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("influencers")
    .insert(buildPayload(parsed.data))
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createInfluencerAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar influencer" };
  }
  revalidatePath("/influencers");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateInfluencerAction(
  id: string,
  fd: FormData,
): Promise<InfluencerActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = influencerSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("influencers")
    .update(buildPayload(parsed.data))
    .eq("id", id);
  if (error) {
    console.error("[updateInfluencerAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/influencers");
  revalidatePath(`/influencers/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteInfluencerAction(
  id: string,
): Promise<InfluencerActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase
    .from("influencers")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteInfluencerAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/influencers");
  revalidatePath("/");
  return { ok: true };
}

/** Atualiza apenas o status (usado em quick-actions). */
export async function updateInfluencerStatusAction(
  id: string,
  status: InfluencerStatus,
): Promise<InfluencerActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  if (!INFLUENCER_STATUSES.includes(status)) {
    return { ok: false, message: "Status inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("influencers")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("[updateInfluencerStatusAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/influencers");
  revalidatePath(`/influencers/${id}`);
  return { ok: true, id };
}

/** Adiciona uma URL de post publicado. */
export async function addPostUrlAction(
  influencerId: string,
  url: string,
): Promise<InfluencerActionResult> {
  if (!influencerId) return { ok: false, message: "ID inválido" };
  const cleaned = (url ?? "").trim();
  if (!cleaned) return { ok: false, message: "URL obrigatória" };
  if (cleaned.length > 1000) return { ok: false, message: "URL muito longa" };
  const supabase = createClient();
  const { data: current, error: getErr } = await supabase
    .from("influencers")
    .select("posts_url")
    .eq("id", influencerId)
    .maybeSingle();
  if (getErr || !current) {
    return { ok: false, message: getErr?.message ?? "Influencer não encontrado" };
  }
  const next = Array.from(new Set([...(current.posts_url ?? []), cleaned]));
  const { error } = await supabase
    .from("influencers")
    .update({ posts_url: next })
    .eq("id", influencerId);
  if (error) {
    console.error("[addPostUrlAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${influencerId}`);
  return { ok: true, id: influencerId };
}

/** Remove uma URL de post publicado. */
export async function removePostUrlAction(
  influencerId: string,
  url: string,
): Promise<InfluencerActionResult> {
  if (!influencerId) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { data: current, error: getErr } = await supabase
    .from("influencers")
    .select("posts_url")
    .eq("id", influencerId)
    .maybeSingle();
  if (getErr || !current) {
    return { ok: false, message: getErr?.message ?? "Influencer não encontrado" };
  }
  const next = (current.posts_url ?? []).filter((u) => u !== url);
  const { error } = await supabase
    .from("influencers")
    .update({ posts_url: next })
    .eq("id", influencerId);
  if (error) {
    console.error("[removePostUrlAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/influencers/${influencerId}`);
  return { ok: true, id: influencerId };
}
