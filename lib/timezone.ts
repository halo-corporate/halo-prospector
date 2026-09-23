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

export function formatBR(
  date: Date | string | number,
  fmt = "dd/MM/yyyy HH:mm",
): string {
  return formatInTimeZone(date, BR_TZ, fmt, { locale: ptBR });
}

export function toBR(date: Date | string | number): Date {
  return toZonedTime(date, BR_TZ);
}

export function fromBRInput(brDateTimeLocal: string | Date): Date {
  return fromZonedTime(brDateTimeLocal, BR_TZ);
}

export function todayRangeBR(): { startUtc: Date; endUtc: Date } {
  const nowBR = toBR(new Date());
  const y = nowBR.getFullYear();
  const m = String(nowBR.getMonth() + 1).padStart(2, "0");
  const d = String(nowBR.getDate()).padStart(2, "0");
  const startUtc = fromZonedTime(`${y}-${m}-${d}T00:00:00`, BR_TZ);
  const endUtc = fromZonedTime(`${y}-${m}-${d}T23:59:59.999`, BR_TZ);
  return { startUtc, endUtc };
}

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

export function isOverdueBR(date: Date | string): boolean {
  return new Date(date).getTime() < Date.now();
}

export function toDateTimeLocalBR(date: Date | string | number): string {
  return formatInTimeZone(date, BR_TZ, "yyyy-MM-dd'T'HH:mm");
}

export function nowBRInputValue(): string {
  return toDateTimeLocalBR(new Date());
}

/**
 * Data ISO (yyyy-MM-dd) do "hoje" em fuso BR. Usar para colunas DATE
 * (data_pago, data_combinada, etc) — nunca `new Date().toISOString().slice(0,10)`
 * porque esse pega UTC e fica 1 dia adiantado depois das 21h BR.
 */
export function todayBRISO(now: Date = new Date()): string {
  return formatInTimeZone(now, BR_TZ, "yyyy-MM-dd");
}

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

// ---------------------------------------------------------------------------
// Semanas (segunda 00:00 BR → domingo 23:59 BR)
// ---------------------------------------------------------------------------

/**
 * Data ISO (yyyy-MM-dd) da segunda-feira da semana atual em fuso BR.
 * Esse valor é o `semana` armazenado em `tarefas_semanais`.
 */
export function currentWeekStartBR(now: Date = new Date()): string {
  const br = toBR(now);
  // 0 = domingo, 1 = segunda, ..., 6 = sabado. Queremos diff para a segunda.
  const dow = br.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // domingo volta 6 dias; resto = 1 - dow
  const monday = new Date(br);
  monday.setDate(br.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Soma `n` semanas a uma data yyyy-MM-dd (BR).
 */
export function addWeeksISO(weekStartISO: string, n: number): string {
  const [y, m, d] = weekStartISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n * 7);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Label legível pra exibir a semana ("Semana de 27/05 — 02/06").
 */
export function formatWeekLabelBR(weekStartISO: string): string {
  const [y, m, d] = weekStartISO.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

export function _debugBR(date: Date | string = new Date()): {
  iso: string;
  br: string;
  brInput: string;
  weekStart: string;
} {
  const d = typeof date === "string" ? new Date(date) : date;
  return {
    iso: d.toISOString(),
    br: formatBR(d, "dd/MM/yyyy HH:mm:ss zzz"),
    brInput: toDateTimeLocalBR(d),
    weekStart: currentWeekStartBR(d),
  };
}

export { format };
