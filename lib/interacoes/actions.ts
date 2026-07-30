"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { fromBRInput } from "@/lib/timezone";

const canalEnum = z.enum([
  "whatsapp",
  "instagram",
  "email",
  "telefone",
  "presencial",
  "outro",
]);
const tipoEnum = z.enum([
  "envio_mensagem",
  "resposta_recebida",
  "ligacao_atendida",
  "ligacao_nao_atendida",
  "reuniao",
  "nota_interna",
]);

const interacaoSchema = z.object({
  lead_id: z.string().uuid("Lead inválido"),
  decisor_id: z
    .string()
    .uuid("Decisor inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  data_hora_br: z.string().min(1, "Data/hora obrigatória"), // input datetime-local em BR
  canal: canalEnum,
  tipo: tipoEnum,
  resumo: z.string().trim().min(1, "Resumo obrigatório").max(2000),
});

export type InteracaoActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function createInteracaoAction(
  fd: FormData,
): Promise<InteracaoActionResult> {
  const parsed = interacaoSchema.safeParse({
    lead_id: fd.get("lead_id"),
    decisor_id: fd.get("decisor_id") || undefined,
    data_hora_br: fd.get("data_hora_br"),
    canal: fd.get("canal"),
    tipo: fd.get("tipo"),
    resumo: fd.get("resumo"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }

  const data_hora_utc = fromBRInput(parsed.data.data_hora_br).toISOString();

  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("interacoes")
    .insert({
      lead_id: parsed.data.lead_id,
      decisor_id: parsed.data.decisor_id ?? null,
      data_hora: data_hora_utc,
      canal: parsed.data.canal,
      tipo: parsed.data.tipo,
      resumo: parsed.data.resumo,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createInteracaoAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao registrar" };
  }

  revalidatePath(`/crm/${parsed.data.lead_id}`);
  revalidatePath("/crm");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateInteracaoAction(
  id: string,
  fd: FormData,
): Promise<InteracaoActionResult> {
  if (!id) return { ok: false, message: "ID ausente" };

  const parsed = interacaoSchema.safeParse({
    lead_id: fd.get("lead_id"),
    decisor_id: fd.get("decisor_id") || undefined,
    data_hora_br: fd.get("data_hora_br"),
    canal: fd.get("canal"),
    tipo: fd.get("tipo"),
    resumo: fd.get("resumo"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }

  const data_hora_utc = fromBRInput(parsed.data.data_hora_br).toISOString();

  const supabase = createSessionClient();
  // RLS (user_id) garante o escopo — segue o mesmo padrão de create/delete.
  const { error } = await supabase
    .from("interacoes")
    .update({
      lead_id: parsed.data.lead_id,
      decisor_id: parsed.data.decisor_id ?? null,
      data_hora: data_hora_utc,
      canal: parsed.data.canal,
      tipo: parsed.data.tipo,
      resumo: parsed.data.resumo,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateInteracaoAction]", error);
    return { ok: false, message: error.message };
  }

  revalidatePath(`/crm/${parsed.data.lead_id}`);
  revalidatePath("/crm");
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteInteracaoAction(
  id: string,
  leadId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createSessionClient();
  const { error } = await supabase.from("interacoes").delete().eq("id", id);
  if (error) {
    console.error("[deleteInteracaoAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/crm");
  return { ok: true };
}
