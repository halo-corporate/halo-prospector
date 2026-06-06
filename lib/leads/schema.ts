import { z } from "zod";

// Cada slug individual: minúsculas, alfanumérico + underscore.
const verticalSlug = z
  .string()
  .trim()
  .min(2, "Vertical inválida")
  .max(40, "Vertical inválida")
  .regex(/^[a-z][a-z0-9_]*$/, "Vertical inválida");

/**
 * Aceita CSV ("clinicas_medicas,academias") ou array. Min 1, dedup, trim.
 * Vertical é NOT NULL no banco (legado escalar), então a UI exige pelo menos
 * 1 selecionado.
 */
const verticaisFromCsv = z.preprocess(
  (v) => {
    let arr: unknown[] = [];
    if (Array.isArray(v)) arr = v;
    else if (typeof v === "string") {
      arr = v.split(",").map((s) => s.trim()).filter(Boolean);
    }
    // Dedup preservando ordem
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      if (typeof x === "string" && !seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
    }
    return out;
  },
  z.array(verticalSlug).min(1, "Selecione ao menos 1 vertical"),
);

const enumLeadStatus = z.enum([
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

const enumLeadTemperatura = z.enum(["frio", "morno", "quente"]);

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optStr = z.preprocess(emptyToNull, z.string().nullable().optional());
const optInt = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  },
  z.number().int().nonnegative().nullable().optional(),
);

const optEstado = z.preprocess(
  (v) =>
    typeof v === "string" && v.trim() === ""
      ? null
      : typeof v === "string"
        ? v.trim().toUpperCase()
        : v,
  z
    .string()
    .length(2, "UF deve ter 2 letras")
    .regex(/^[A-Z]{2}$/, "UF deve ser 2 letras maiúsculas")
    .nullable()
    .optional(),
);

const optTemperatura = z.preprocess(
  emptyToNull,
  enumLeadTemperatura.nullable().optional(),
);

const optDateTime = z.preprocess(
  emptyToNull,
  z.string().nullable().optional(), // ISO string já em UTC
);

/**
 * Schema base de Lead (campos editáveis pelo usuário).
 */
export const leadBaseSchema = z.object({
  empresa: z.string().trim().min(1, "Empresa obrigatória"),
  verticais: verticaisFromCsv,
  cidade: optStr,
  estado: optEstado,
  bairro_regiao: optStr,
  sub_nicho: optStr,
  site: optStr,
  instagram: optStr,
  telefone: optStr,
  email: z.preprocess(
    emptyToNull,
    z.string().email("E-mail inválido").nullable().optional(),
  ),
  ticket_estimado: optInt,
  status: enumLeadStatus.default("novo"),
  temperatura: optTemperatura,
  proximo_passo: optStr,
  proximo_followup: optDateTime,
  motivo_perda: optStr,
  observacoes: optStr,
});

export type LeadFormInput = z.infer<typeof leadBaseSchema>;

/**
 * Regra de negócio: status perdido/descartado exige motivo_perda.
 */
export const leadFormSchema = leadBaseSchema.superRefine((val, ctx) => {
  if (
    (val.status === "perdido" || val.status === "descartado") &&
    (!val.motivo_perda || val.motivo_perda.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["motivo_perda"],
      message: "Motivo obrigatório para perdido/descartado",
    });
  }
});

/**
 * Helper pra extrair valores de FormData crus. `verticais` vem como CSV no
 * hidden input que o form renderiza a partir do estado do multi-select.
 */
export function leadFormDataToObject(fd: FormData) {
  return {
    empresa: fd.get("empresa"),
    verticais: fd.get("verticais") ?? "",
    cidade: fd.get("cidade"),
    estado: fd.get("estado"),
    bairro_regiao: fd.get("bairro_regiao"),
    sub_nicho: fd.get("sub_nicho"),
    site: fd.get("site"),
    instagram: fd.get("instagram"),
    telefone: fd.get("telefone"),
    email: fd.get("email"),
    ticket_estimado: fd.get("ticket_estimado"),
    status: fd.get("status") || "novo",
    temperatura: fd.get("temperatura"),
    proximo_passo: fd.get("proximo_passo"),
    proximo_followup: fd.get("proximo_followup"),
    motivo_perda: fd.get("motivo_perda"),
    observacoes: fd.get("observacoes"),
  };
}
