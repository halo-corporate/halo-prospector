/**
 * Helpers de formatação compartilhados (BRL, datas).
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
 * Formata data ISO yyyy-MM-dd como dd/MM/yyyy.
 */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
