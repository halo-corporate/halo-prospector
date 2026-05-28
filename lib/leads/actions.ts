"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .insert({
      empresa: parsed.data.empresa,
      vertical: parsed.data.vertical,
      cidade: parsed.data.cidade ?? null,
      estado: parsed.data.estado ?? null,
      bairro_regiao: parsed.data.bairro_regiao ?? null,
      sub_nicho: parsed.data.sub_nicho ?? null,
      site: parsed.data.site ?? null,
      instagram: parsed.data.instagram ?? null,
      telefone: parsed.data.telefone ?? null,
      email: parsed.data.email ?? null,
      ticket_estimado: parsed.data.ticket_estimado ?? null,
      status: parsed.data.status,
      temperatura: parsed.data.temperatura ?? null,
      proximo_passo: parsed.data.proximo_passo ?? null,
      proximo_followup: brDateTimeLocalToUtcIso(parsed.data.proximo_followup),
      motivo_perda: parsed.data.motivo_perda ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createLeadAction]", error);
    return {
      status: "error",
      message: error?.message ?? "Erro ao criar lead",
    };
  }

  revalidatePath("/leads");
  revalidatePath("/");
  redirect(`/leads/${data.id}`);
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
    .update({
      empresa: parsed.data.empresa,
      vertical: parsed.data.vertical,
      cidade: parsed.data.cidade ?? null,
      estado: parsed.data.estado ?? null,
      bairro_regiao: parsed.data.bairro_regiao ?? null,
      sub_nicho: parsed.data.sub_nicho ?? null,
      site: parsed.data.site ?? null,
      instagram: parsed.data.instagram ?? null,
      telefone: parsed.data.telefone ?? null,
      email: parsed.data.email ?? null,
      ticket_estimado: parsed.data.ticket_estimado ?? null,
      status: parsed.data.status,
      temperatura: parsed.data.temperatura ?? null,
      proximo_passo: parsed.data.proximo_passo ?? null,
      proximo_followup: brDateTimeLocalToUtcIso(parsed.data.proximo_followup),
      motivo_perda: parsed.data.motivo_perda ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateLeadAction]", error);
    return { status: "error", message: error.message };
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/");
  return { status: "success", id };
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
  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads");
}
