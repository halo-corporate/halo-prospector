/**
 * Helpers de formatação financeira e de mês.
 */

/**
 * Formata um valor numérico (em reais com decimais) como BRL.
 * @example formatBRL(1500.5) -> "R$ 1.500,50"
 */
export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata como porcentagem PT-BR. 10 → "10%". 12.5 → "12,5%".
 */
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Mês corrente em BR no formato yyyy-MM (ex: "2026-05").
 */
export function currentMonthBR(): string {
  const now = new Date();
  // Aplica offset de São Paulo (-03:00) sem depender de Intl pra evitar bug
  // de UTC. Como BR não tem horário de verão atualmente, -03:00 fixo serve.
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const br = new Date(utcMillis - 3 * 60 * 60 * 1000);
  return `${br.getUTCFullYear()}-${String(br.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Devolve os últimos N meses (incluindo o atual) no formato { value, label }.
 * Mais recente primeiro.
 */
export function lastMonths(
  n: number,
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    out.push({
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }
  return out;
}

/**
 * Para um mês "yyyy-MM", retorna o range de datas [primeiro, último] como
 * strings yyyy-MM-dd — pronto para filtrar a coluna `data_venda` (tipo date).
 */
export function monthBounds(monthYYYYMM: string): {
  start: string;
  end: string;
} | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthYYYYMM);
  if (!m) return null;
  const year = parseInt(m[1]!, 10);
  const month = parseInt(m[2]!, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Formata data ISO yyyy-MM-dd como dd/MM/yyyy.
 */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Label de um mês "yyyy-MM" → "Maio/2026".
 */
export function formatMonthLabel(monthYYYYMM: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthYYYYMM);
  if (!m) return monthYYYYMM;
  const y = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  const d = new Date(y, mm - 1, 1);
  const label = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Devolve o mês anterior em formato yyyy-MM.
 */
export function previousMonth(monthYYYYMM: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthYYYYMM);
  if (!m) return null;
  const y = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Variação percentual entre dois valores. Retorna null se o anterior
 * for 0 (não dá pra comparar).
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
