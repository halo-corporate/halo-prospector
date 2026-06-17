"use server";

// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// Sob SSO o HALO não tem sessão Supabase própria (auth.getUser() retorna null).
// O path do upload de etiqueta usa a constante fixa HALO_USER_ID, não user.id.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, HALO_USER_ID } from "@/lib/supabase/server";
import { ENVIO_STATUSES, type EnvioStatus } from "@/lib/database.types";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number, msg = "Texto muito longo") =>
  z.preprocess(
    emptyToNull,
    z.string().max(max, msg).nullable().optional(),
  );

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .nullable()
    .optional(),
);

const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z
    .number()
    .int("Deve ser inteiro")
    .positive("Deve ser > 0")
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

const enderecoSchema = z
  .object({
    cep: optionalText(20),
    rua: optionalText(200),
    numero: optionalText(20),
    complemento: optionalText(200),
    bairro: optionalText(120),
    cidade: optionalText(120),
    uf: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .regex(/^[A-Za-z]{2}$/, "UF deve ter 2 letras")
          .transform((s) => s.toUpperCase())
          .nullable()
          .optional(),
      ),
  })
  .optional()
  .nullable();

const dimensoesSchema = z
  .object({
    altura: z.coerce.number().positive().optional(),
    largura: z.coerce.number().positive().optional(),
    comprimento: z.coerce.number().positive().optional(),
  })
  .optional()
  .nullable();

const envioSchema = z.object({
  destinatario_nome: z
    .string()
    .trim()
    .min(1, "Destinatário obrigatório")
    .max(200, "Máx 200 caracteres"),
  destinatario_documento: optionalText(20),
  destinatario_email: optionalText(200),
  destinatario_telefone: optionalText(20),
  status: z.enum([...ENVIO_STATUSES] as [EnvioStatus, ...EnvioStatus[]]),
  embalagem_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Embalagem inválida").nullable().optional(),
  ),
  proposta_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Proposta inválida").nullable().optional(),
  ),
  influencer_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Influencer inválido").nullable().optional(),
  ),
  lead_id: z.preprocess(
    emptyToNull,
    z.string().uuid("Lead inválido").nullable().optional(),
  ),
  endereco_destino: enderecoSchema,
  peso_g: optionalPositiveInt,
  dimensoes_cm: dimensoesSchema,
  transportadora: optionalText(80),
  servico: optionalText(80),
  codigo_rastreio: optionalText(80),
  tracking_url: optionalText(1000),
  valor_frete: optionalPositiveNum,
  valor_seguro: optionalPositiveNum,
  data_postagem: optionalDate,
  data_entrega_prevista: optionalDate,
  data_entrega_efetiva: optionalDate,
  observacoes: optionalText(2000),
});

export type EnvioActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function parseEnderecoFromForm(fd: FormData) {
  const get = (k: string) => fd.get(`endereco_${k}`) as string | null;
  const cep = get("cep");
  const rua = get("rua");
  const numero = get("numero");
  const complemento = get("complemento");
  const bairro = get("bairro");
  const cidade = get("cidade");
  const uf = get("uf");
  const all = [cep, rua, numero, complemento, bairro, cidade, uf];
  if (all.every((v) => v === null || v === "")) return null;
  return { cep, rua, numero, complemento, bairro, cidade, uf };
}

function parseDimensoesFromForm(fd: FormData) {
  const altura = fd.get("dim_altura");
  const largura = fd.get("dim_largura");
  const comprimento = fd.get("dim_comprimento");
  const all = [altura, largura, comprimento];
  if (all.every((v) => v === null || v === "")) return null;
  return {
    altura: altura ? Number(altura) : undefined,
    largura: largura ? Number(largura) : undefined,
    comprimento: comprimento ? Number(comprimento) : undefined,
  };
}

function parseFormData(fd: FormData) {
  return {
    destinatario_nome: (fd.get("destinatario_nome") ?? "") as string,
    destinatario_documento: fd.get("destinatario_documento"),
    destinatario_email: fd.get("destinatario_email"),
    destinatario_telefone: fd.get("destinatario_telefone"),
    status: ((fd.get("status") ?? "a_despachar") as string) as EnvioStatus,
    embalagem_id: fd.get("embalagem_id"),
    proposta_id: fd.get("proposta_id"),
    influencer_id: fd.get("influencer_id"),
    lead_id: fd.get("lead_id"),
    endereco_destino: parseEnderecoFromForm(fd),
    peso_g: fd.get("peso_g"),
    dimensoes_cm: parseDimensoesFromForm(fd),
    transportadora: fd.get("transportadora"),
    servico: fd.get("servico"),
    codigo_rastreio: fd.get("codigo_rastreio"),
    tracking_url: fd.get("tracking_url"),
    valor_frete: fd.get("valor_frete"),
    valor_seguro: fd.get("valor_seguro"),
    data_postagem: fd.get("data_postagem"),
    data_entrega_prevista: fd.get("data_entrega_prevista"),
    data_entrega_efetiva: fd.get("data_entrega_efetiva"),
    observacoes: fd.get("observacoes"),
  };
}

function buildPayload(parsed: z.infer<typeof envioSchema>) {
  return {
    destinatario_nome: parsed.destinatario_nome,
    destinatario_documento: parsed.destinatario_documento ?? null,
    destinatario_email: parsed.destinatario_email ?? null,
    destinatario_telefone: parsed.destinatario_telefone ?? null,
    status: parsed.status,
    embalagem_id: parsed.embalagem_id ?? null,
    proposta_id: parsed.proposta_id ?? null,
    influencer_id: parsed.influencer_id ?? null,
    lead_id: parsed.lead_id ?? null,
    endereco_destino: parsed.endereco_destino ?? null,
    peso_g: parsed.peso_g ?? null,
    dimensoes_cm: parsed.dimensoes_cm ?? null,
    transportadora: parsed.transportadora ?? null,
    servico: parsed.servico ?? null,
    codigo_rastreio: parsed.codigo_rastreio ?? null,
    tracking_url: parsed.tracking_url ?? null,
    valor_frete: parsed.valor_frete ?? null,
    valor_seguro: parsed.valor_seguro ?? null,
    data_postagem: parsed.data_postagem ?? null,
    data_entrega_prevista: parsed.data_entrega_prevista ?? null,
    data_entrega_efetiva: parsed.data_entrega_efetiva ?? null,
    observacoes: parsed.observacoes ?? null,
  };
}

export async function createEnvioAction(
  fd: FormData,
): Promise<EnvioActionResult> {
  const parsed = envioSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("envios")
    .insert(buildPayload(parsed.data))
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createEnvioAction]", error);
    return { ok: false, message: error?.message ?? "Erro ao criar envio" };
  }
  revalidatePath("/envios");
  revalidatePath("/");
  return { ok: true, id: data.id };
}

export async function updateEnvioAction(
  id: string,
  fd: FormData,
): Promise<EnvioActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const parsed = envioSchema.safeParse(parseFormData(fd));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]!.message };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("envios")
    .update(buildPayload(parsed.data))
    .eq("id", id);
  if (error) {
    console.error("[updateEnvioAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  revalidatePath(`/envios/${id}`);
  revalidatePath("/");
  return { ok: true, id };
}

export async function deleteEnvioAction(
  id: string,
): Promise<EnvioActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { error } = await supabase.from("envios").delete().eq("id", id);
  if (error) {
    console.error("[deleteEnvioAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  revalidatePath("/");
  return { ok: true };
}

/** Atualiza apenas o status (usado em quick-actions). */
export async function updateEnvioStatusAction(
  id: string,
  status: EnvioStatus,
): Promise<EnvioActionResult> {
  if (!id || id.length < 10) return { ok: false, message: "ID inválido" };
  if (!ENVIO_STATUSES.includes(status)) {
    return { ok: false, message: "Status inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("envios")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("[updateEnvioStatusAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  revalidatePath(`/envios/${id}`);
  return { ok: true, id };
}

// ────────────────────────────────────────────────────────────────────────────
// Upload de etiqueta PDF — bucket `etiquetas`
// Estrutura: etiquetas/{user_id}/{envio_id}-{rand}.pdf
// Retorna o `path` no bucket (gravado em envios.etiqueta_url).
// ────────────────────────────────────────────────────────────────────────────

const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadEtiquetaAction(
  envioId: string,
  fd: FormData,
): Promise<EnvioActionResult & { path?: string }> {
  if (!envioId || envioId.length < 10) {
    return { ok: false, message: "ID inválido" };
  }
  const file = fd.get("arquivo") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Arquivo vazio" };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, message: "Arquivo > 8 MB" };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, message: "Envie um PDF" };
  }

  const supabase = createClient();
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${HALO_USER_ID}/${envioId}-${rand}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("etiquetas")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (upErr) {
    console.error("[uploadEtiquetaAction storage]", upErr);
    return { ok: false, message: upErr.message };
  }

  const { error: updErr } = await supabase
    .from("envios")
    .update({ etiqueta_url: path })
    .eq("id", envioId);
  if (updErr) {
    // tenta remover o arquivo já enviado pra não ficar lixo
    await supabase.storage.from("etiquetas").remove([path]);
    console.error("[uploadEtiquetaAction update]", updErr);
    return { ok: false, message: updErr.message };
  }

  revalidatePath(`/envios/${envioId}`);
  return { ok: true, id: envioId, path };
}

/** Gera signed URL (10min) pra abrir o PDF da etiqueta. */
export async function getEtiquetaSignedUrlAction(
  envioId: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!envioId) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { data: envio, error } = await supabase
    .from("envios")
    .select("etiqueta_url")
    .eq("id", envioId)
    .maybeSingle();
  if (error || !envio?.etiqueta_url) {
    return { ok: false, message: "Etiqueta não encontrada" };
  }
  // etiqueta_url pode ser um link EXTERNO (página pública do Melhor Envio, que
  // serve a etiqueta em HTML — não há PDF binário pra baixar) ou um path no
  // bucket (upload manual / quando a API devolve PDF de fato). Link externo abre
  // direto; path do bucket vira signed URL.
  if (/^https?:\/\//i.test(envio.etiqueta_url)) {
    return { ok: true, url: envio.etiqueta_url };
  }
  const { data, error: signErr } = await supabase.storage
    .from("etiquetas")
    .createSignedUrl(envio.etiqueta_url, 600);
  if (signErr || !data?.signedUrl) {
    console.error("[getEtiquetaSignedUrlAction]", signErr);
    return { ok: false, message: signErr?.message ?? "Erro ao gerar URL" };
  }
  return { ok: true, url: data.signedUrl };
}

export async function deleteEtiquetaAction(
  envioId: string,
): Promise<EnvioActionResult> {
  if (!envioId) return { ok: false, message: "ID inválido" };
  const supabase = createClient();
  const { data: envio } = await supabase
    .from("envios")
    .select("etiqueta_url")
    .eq("id", envioId)
    .maybeSingle();
  // Só remove do bucket se for um path do bucket — link externo (Melhor Envio)
  // não tem arquivo nosso pra apagar.
  if (envio?.etiqueta_url && !/^https?:\/\//i.test(envio.etiqueta_url)) {
    await supabase.storage.from("etiquetas").remove([envio.etiqueta_url]);
  }
  const { error } = await supabase
    .from("envios")
    .update({ etiqueta_url: null })
    .eq("id", envioId);
  if (error) {
    console.error("[deleteEtiquetaAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath(`/envios/${envioId}`);
  return { ok: true, id: envioId };
}
