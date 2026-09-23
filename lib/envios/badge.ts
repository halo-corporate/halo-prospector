import type { EnvioStatus } from "@/lib/database.types";

/**
 * Classes Tailwind para o pill colorido de status de envio.
 * Progressão visual: slate (parado) → primary (em andamento) → emerald (sucesso)
 * → red (falha). Estados intermediários usam primary/info.
 */
export function envioStatusBadgeClass(s: EnvioStatus): string {
  switch (s) {
    case "a_despachar":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "embalado":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "etiquetado":
      return "bg-primary/15 text-primary border-primary/30";
    case "postado":
      return "bg-primary/20 text-primary border-primary/40";
    case "em_transito":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "entregue":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "devolvido":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "extraviado":
      return "bg-red-500/15 text-red-300 border-red-500/30";
  }
}
