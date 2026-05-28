/**
 * Helpers de fuso horário — América/São Paulo.
 *
 * REGRA INEGOCIÁVEL DO PROJETO:
 *  - Banco armazena tudo em UTC (timestamptz padrão do Postgres).
 *  - Camada de apresentação SEMPRE converte para America/Sao_Paulo aqui.
 *  - Nunca usar `new Date().toISOString()` direto em filtros sem normalizar fuso.
 *  - Inputs de datetime: user digita em BR, código converte para UTC antes de salvar.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BR_TZ = "America/Sao_Paulo";

/**
 * Formata um Date (ou ISO string UTC) para string no fuso BR.
 * @example formatBR(new Date(), "dd/MM/yyyy HH:mm") -> "27/05/2026 18:32"
 */
export function formatBR(
  date: Date | string | number,
  fmt = "dd/MM/yyyy HH:mm",
): string {
  return formatInTimeZone(date, BR_TZ, fmt, { locale: ptBR });
}

/**
 * Converte um Date UTC para um Date "wall-clock" no fuso BR.
 * Útil para passar a date-pickers que esperam Date local.
 */
export function toBR(date: Date | string | number): Date {
  return toZonedTime(date, BR_TZ);
}

/**
 * Converte um valor digitado pelo usuário (interpretado como horário BR)
 * para um Date em UTC, pronto para enviar ao Supabase.
 *
 * @param brDateTimeLocal Pode ser:
 *  - string no formato "yyyy-MM-ddTHH:mm" (output de <input type="datetime-local">)
 *  - Date object que representa a hora-de-parede BR
 * @example fromBRInput("2026-05-27T15:30") -> Date em UTC equivalente a 27/05 15:30 BR
 */
export function fromBRInput(brDateTimeLocal: string | Date): Date {
  return fromZonedTime(brDateTimeLocal, BR_TZ);
}

/**
 * Retorna o início e fim do dia "hoje" no fuso BR, expressos em UTC,
 * prontos para filtros tipo `gte` / `lte` no Supabase.
 */
export function todayRangeBR(): { startUtc: Date; endUtc: Date } {
  const nowBR = toBR(new Date());
  const y = nowBR.getFullYear();
  const m = String(nowBR.getMonth() + 1).padStart(2, "0");
  const d = String(nowBR.getDate()).padStart(2, "0");
  const startUtc = fromZonedTime(`${y}-${m}-${d}T00:00:00`, BR_TZ);
  const endUtc = fromZonedTime(`${y}-${m}-${d}T23:59:59.999`, BR_TZ);
  return { startUtc, endUtc };
}

/**
 * Retorna o range "próximos N dias" a partir de amanhã, no fuso BR (em UTC).
 */
export function nextNDaysRangeBR(days: number): { startUtc: Date; endUtc: Date } {
  const nowBR = toBR(new Date());
  const start = new Date(nowBR);
  start.setDate(start.getDate() + 1);
  const end = new Date(nowBR);
  end.setDate(end.getDate() + days);

  const fmtDay = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const startUtc = fromZonedTime(`${fmtDay(start)}T00:00:00`, BR_TZ);
  const endUtc = fromZonedTime(`${fmtDay(end)}T23:59:59.999`, BR_TZ);
  return { startUtc, endUtc };
}

/**
 * Verifica se uma data está vencida em relação a "agora" no fuso BR.
 */
export function isOverdueBR(date: Date | string): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Converte um Date para o valor que vai no <input type="datetime-local">
 * (string "yyyy-MM-ddTHH:mm" no fuso BR).
 */
export function toDateTimeLocalBR(date: Date | string | number): string {
  return formatInTimeZone(date, BR_TZ, "yyyy-MM-dd'T'HH:mm");
}

/**
 * "Agora" expresso como string para <input type="datetime-local"> em fuso BR.
 * Útil como default em modais de "registrar interação".
 */
export function nowBRInputValue(): string {
  return toDateTimeLocalBR(new Date());
}

/**
 * Formatador human-friendly: "há 2 horas", "ontem às 14:30", etc.
 * Versão simples — pode ser substituída por date-fns/formatDistance no futuro.
 */
export function formatBRHuman(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return formatBR(d, "dd/MM HH:mm");
}

/**
 * Sanity-check util para testes manuais.
 * Não usar em produção (apenas dev/console).
 */
export function _debugBR(date: Date | string = new Date()): {
  iso: string;
  br: string;
  brInput: string;
} {
  const d = typeof date === "string" ? new Date(date) : date;
  return {
    iso: d.toISOString(),
    br: formatBR(d, "dd/MM/yyyy HH:mm:ss zzz"),
    brInput: toDateTimeLocalBR(d),
  };
}

// Re-export para conveniência
export { format };
