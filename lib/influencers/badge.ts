import type {
  InfluencerStatus,
  PagamentoStatus,
} from "@/lib/database.types";

export function influencerStatusBadgeClass(s: InfluencerStatus): string {
  switch (s) {
    case "prospeccao":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "contatado":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "negociando":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "kit_enviado":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "postou":
      return "bg-primary/15 text-primary border-primary/30";
    case "parceria_ativa":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "encerrado":
      return "bg-red-500/15 text-red-300 border-red-500/30";
  }
}

export function pagamentoStatusBadgeClass(s: PagamentoStatus): string {
  switch (s) {
    case "pendente":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "pago":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "cancelado":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}
