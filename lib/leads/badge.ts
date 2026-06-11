import type { LeadStatus, LeadTemperatura } from "@/lib/database.types";

/**
 * Classes Tailwind para o badge de status.
 *
 * V2: accent único = azul HALO (#0071E3 = `primary`). Removidos âmbar e
 * laranja. Mantidos vermelho (perdido), emerald (ganho), zinc (descartado),
 * roxo (passado_closer) por serem cores semânticas distintas — não accents.
 *
 * Variação de intensidade do azul HALO (sólido vs com /70) cria hierarquia
 * dentro do fluxo: aquecido = mais quente (sólido), em_qualificação = morno
 * (70%), pesquisando/tentativa = frio (azul mais claro / opacidade mais baixa).
 */
export function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "novo":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "pesquisando":
      return "bg-primary/10 text-primary/80 border-primary/25";
    case "tentativa_contato":
      return "bg-primary/15 text-primary/90 border-primary/30";
    case "em_qualificacao":
      return "bg-primary/15 text-primary border-primary/35";
    case "aquecido":
      return "bg-primary/25 text-primary border-primary/50";
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

/**
 * Cores de temperatura — V4: badge NEON com glow + pulse contínuo.
 *
 * Cada temperatura tem uma cor neon dedicada via classe `.halo-neon-temp`
 * + modifier `.is-frio|is-morno|is-quente` (definidas em globals.css).
 * O pulse é forte e visível independente da cor.
 *
 * frio = sky-400 (azul gelo)
 * morno = HALO blue (#0071E3)
 * quente = red-400 (vermelho calor)
 */
export function temperaturaBadgeClass(t: LeadTemperatura): string {
  const base = "halo-neon-temp";
  switch (t) {
    case "frio":
      return `${base} is-frio`;
    case "morno":
      return `${base} is-morno`;
    case "quente":
      return `${base} is-quente`;
  }
}
