import type { LeadStatus, LeadTemperatura } from "@/lib/database.types";

/**
 * Classes Tailwind para o badge de status. Mantemos consistente em
 * lista, detalhe e dashboard.
 */
export function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "novo":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "pesquisando":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "tentativa_contato":
      return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    case "em_qualificacao":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "aquecido":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "passado_closer":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "ganho":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "perdido":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "descartado":
      return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
  }
}

export function temperaturaBadgeClass(t: LeadTemperatura): string {
  switch (t) {
    case "frio":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "morno":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "quente":
      return "bg-red-500/15 text-red-300 border-red-500/30";
  }
}
