"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/lib/database.types";
import { fromBRInput } from "@/lib/timezone";
import { leadFormSchema, leadFormDataToObject } from "./schema";

export type LeadActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; id: string };

/**
 * Converte uma string de <input type="datetime-local"> (que o usuário digita
 * em BR) para UTC ISO. Se vier null/empty, retorna null.
 */
function brDateTimeLocalToUtcIso(value: string | null | undefined): string | null {
  if (!value) return null;
  // value: "2026-05-27T15:30" — interpretado como hora BR
  return fromBRInput(value).toISOString();
}

function formatZodErrors(issues: import("zod").ZodIssue[]): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path[0]?.toString();
    if (key && !fieldErrors[key]) fieldErrors[key] = i.message;
  }
  return {
    message: issues[0]?.message ?? "Dados inválidos",
    fieldErrors,
  };
}

/**
 * Durante a transição (migration 0010 add, 0011 drop), escrevemos tanto a
 * coluna array nova (`verticais`) quanto o escalar antigo (`vertical`), pra
 * compat. Depois do drop 0011, basta remover `vertical` daqui.
 */
function buildLeadPayload(parsed: import("zod").infer<typeof leadFormSchema>) {
  return {
    empresa: parsed.empresa,
    vertical: parsed.verticais[0]!, // legado: NOT NULL no banco
    verticais: parsed.verticais,
    cidade: parsed.cidade ?? null,
    estado: parsed.estado ?? null,
    bairro_regiao: parsed.bairro_regiao ?? null,
    sub_nicho: parsed.sub_nicho ?? null,
    telefone: parsed.telefone ?? null,
    celular: parsed.celular ?? null,
    // Multi-contato (text[]). Colunas antigas site/instagram/email ficam
    // congeladas (não escrevemos mais — drop numa migration futura).
    sites: parsed.sites,
    instagrams: parsed.instagrams,
    emails: parsed.emails,
    ticket_estimado: parsed.ticket_estimado ?? null,
    status: parsed.status,
    temperatura: parsed.temperatura ?? null,
    proximo_passo: parsed.proximo_passo ?? null,
    proximo_followup: brDateTimeLocalToUtcIso(parsed.proximo_followup),
    motivo_perda: parsed.motivo_perda ?? null,
    observacoes: parsed.observacoes ?? null,
  };
}

/**
 * CREATE — Cria um lead novo. Redireciona pro detalhe em sucesso.
 */
export async function createLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const raw = leadFormDataToObject(formData);
  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", ...formatZodErrors(parsed.error.issues) };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(buildLeadPayload(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createLeadAction]", error);
    return {
      status: "error",
      message: error?.message ?? "Erro ao criar lead",
    };
  }

  revalidatePath("/crm");
  revalidatePath("/");
  redirect(`/crm/${data.id}`);
}

/**
 * UPDATE — Atualiza um lead. Retorna sucesso/erro para a UI; não redireciona.
 */
export async function updateLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const id = formData.get("id")?.toString();
  if (!id) return { status: "error", message: "ID ausente" };

  const raw = leadFormDataToObject(formData);
  const parsed = leadFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", ...formatZodErrors(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update(buildLeadPayload(parsed.data))
    .eq("id", id);

  if (error) {
    console.error("[updateLeadAction]", error);
    return { status: "error", message: error.message };
  }

  revalidatePath(`/crm/${id}`);
  revalidatePath("/crm");
  revalidatePath("/");
  return { status: "success", id };
}

/**
 * UPDATE STATUS — alteração rápida de status a partir do board CRM.
 * Não roda zod do form completo; valida apenas o status contra o enum.
 */
const VALID_STATUS_SET = new Set<LeadStatus>([
  "novo",
  "pesquisando",
  "tentativa_contato",
  "em_qualificacao",
  "aquecido",
  "passado_closer",
  "ganho",
  "perdido",
  "descartado",
]);

function isLeadStatus(v: string): v is LeadStatus {
  return VALID_STATUS_SET.has(v as LeadStatus);
}

export async function updateLeadStatusAction(
  id: string,
  nextStatus: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!id) return { ok: false, message: "ID ausente" };
  if (!isLeadStatus(nextStatus)) {
    return { ok: false, message: "Status inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: nextStatus })
    .eq("id", id);
  if (error) {
    console.error("[updateLeadStatusAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * DELETE — Deleta um lead (cascade limpa decisores e interações).
 * Redireciona pra /leads.
 */
export async function deleteLeadAction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) {
    console.error("[deleteLeadAction]", error);
    throw new Error(error.message);
  }
  revalidatePath("/crm");
  revalidatePath("/");
  redirect("/crm");
}
