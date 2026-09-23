import type { PropostaStatus } from "@/lib/database.types";

/**
 * Classes Tailwind para o pill colorido de status de proposta.
 * Cores semânticas distintas:
 *  - aberto: cinza/slate (neutro, esperando ação)
 *  - negociacao: azul HALO primary (ativo, em movimento)
 *  - recusado: vermelho (negativo)
 *  - convertido: verde emerald (sucesso)
 */
export function propostaStatusBadgeClass(s: PropostaStatus): string {
  switch (s) {
    case "aberto":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "negociacao":
      return "bg-primary/15 text-primary border-primary/30";
    case "recusado":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "convertido":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  }
}
