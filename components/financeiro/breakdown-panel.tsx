import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/financeiro/format";
import {
  VENDA_RESPONSAVEIS,
  VENDA_RESPONSAVEL_LABELS,
  VENDA_STATUS_LABELS,
  type VendaStatus,
} from "@/lib/database.types";
import type {
  ResponsavelBreakdown,
  StatusBreakdown,
} from "@/lib/financeiro/queries";

function statusBadgeClass(s: VendaStatus): string {
  switch (s) {
    case "pago":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "parcial":
      return "bg-primary/15 text-primary border-primary/30";
    case "pendente":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "cancelado":
      return "bg-red-500/15 text-red-300 border-red-500/30";
  }
}

interface Props {
  responsaveis: ResponsavelBreakdown[];
  statuses: StatusBreakdown[];
  totalLiquido: number;
}

export function BreakdownPanel({
  responsaveis,
  statuses,
  totalLiquido,
}: Props) {
  // Garante que todos os 4 responsáveis apareçam (mesmo com 0 vendas)
  const respMap = new Map(responsaveis.map((r) => [r.responsavel, r]));
  const respFull = VENDA_RESPONSAVEIS.map((r) => {
    return (
      respMap.get(r) ?? {
        responsavel: r,
        liquido: 0,
        comissao: 0,
        quantidade: 0,
      }
    );
  }).sort((a, b) => b.liquido - a.liquido);

  const maxLiquido = Math.max(1, ...respFull.map((r) => r.liquido));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Responsáveis (col-span 2) */}
      <section className="lg:col-span-2 halo-glass rounded-halo p-4 space-y-3">
        <p className="halo-eyebrow">Por responsável</p>
        <div className="space-y-2">
          {respFull.map((r) => {
            const pct = totalLiquido > 0 ? (r.liquido / totalLiquido) * 100 : 0;
            const barPct = (r.liquido / maxLiquido) * 100;
            return (
              <div key={r.responsavel} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {VENDA_RESPONSAVEL_LABELS[r.responsavel]}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {r.quantidade}{" "}
                      {r.quantidade === 1 ? "venda" : "vendas"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span>{formatBRL(r.liquido)}</span>
                    <span className="text-muted-foreground text-[10px]">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-primary transition-all",
                      r.liquido === 0 && "opacity-30",
                    )}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status */}
      <section className="halo-glass rounded-halo p-4 space-y-3">
        <p className="halo-eyebrow">Por status</p>
        {statuses.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            Sem vendas no período.
          </p>
        ) : (
          <div className="space-y-2">
            {statuses.map((s) => (
              <div
                key={s.status}
                className="flex items-center justify-between gap-2"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "border text-[10px] py-0",
                    statusBadgeClass(s.status),
                  )}
                >
                  {VENDA_STATUS_LABELS[s.status]}
                </Badge>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{s.quantidade}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {formatBRL(s.liquido)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
