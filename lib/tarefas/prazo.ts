import { todayBRISO } from "@/lib/timezone";
import type { TarefaPrioridade } from "@/lib/database.types";

/**
 * Proximidade de um prazo (deadline) relativa a agora, em fuso BR.
 * Dirige o "glow de proximidade" do checklist:
 *   - overdue: já passou
 *   - today:   vence hoje (BR) e ainda não passou
 *   - soon:    vence nas próximas 48h (mas não hoje)
 *   - later:   além disso (sem glow)
 */
export type DeadlineProximity = "overdue" | "today" | "soon" | "later";

export function deadlineProximity(
  prazoIso: string,
  now: Date = new Date(),
): DeadlineProximity {
  const t = new Date(prazoIso).getTime();
  const n = now.getTime();
  if (t < n) return "overdue";
  if (todayBRISO(new Date(prazoIso)) === todayBRISO(now)) return "today";
  const diffH = (t - n) / 3_600_000;
  if (diffH <= 48) return "soon";
  return "later";
}

/** Classe CSS do glow de proximidade (definida em globals.css). "" se later. */
export function deadlineGlowClass(p: DeadlineProximity): string {
  switch (p) {
    case "overdue":
      return "halo-deadline is-overdue";
    case "today":
      return "halo-deadline is-today";
    case "soon":
      return "halo-deadline is-soon";
    case "later":
      return "";
  }
}

/**
 * Classes Tailwind do chip de prioridade. alta = vermelho (destructive),
 * média = âmbar, baixa = muted/neutro.
 */
export function prioridadeChipClass(p: TarefaPrioridade): string {
  switch (p) {
    case "alta":
      return "bg-destructive/15 text-destructive";
    case "media":
      return "bg-amber-500/15 text-amber-400";
    case "baixa":
      return "bg-muted text-muted-foreground";
  }
}
