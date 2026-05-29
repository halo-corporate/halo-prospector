import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentMonthBR, formatBRL, formatMonthLabel, pctChange } from "@/lib/financeiro/format";
import type { VendaAggregate } from "@/lib/financeiro/queries";

interface Props {
  /** Período a que se refere (yyyy-MM). null = "Todos meses". */
  mes: string | null;
  current: VendaAggregate;
  previous: VendaAggregate | null;
}

export function DREPanel({ mes, current, previous }: Props) {
  const isCurrentMonth = mes !== null && mes === currentMonthBR();
  const periodLabel = mes ? formatMonthLabel(mes) : "Todos os períodos";

  const moMBruto = previous ? pctChange(current.bruto, previous.bruto) : null;

  return (
    <section className="rounded-[18px] border border-white/10 bg-card/40 p-5 sm:p-6 space-y-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            DRE — {periodLabel}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Faturamento bruto, comissões e métricas do período filtrado.
          </p>
        </div>
        {isCurrentMonth ? (
          <span
            className="text-[10px] uppercase tracking-wide text-primary/80 border border-primary/30 rounded px-2 py-0.5"
            title="Mês em andamento — comparação parcial"
          >
            Mês em andamento
          </span>
        ) : null}
      </div>

      {/* Faturamento Bruto — destaque visual maior */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Faturamento bruto
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="font-display font-bold tracking-[0.02em] text-4xl sm:text-5xl">
            {formatBRL(current.bruto)}
          </p>
          {mes && previous ? (
            <MoMBadge
              pct={moMBruto}
              previousValue={previous.bruto}
              previousLabel={
                mes
                  ? formatMonthLabel(
                      // mes anterior label só pra exibição
                      previousMonthLabel(mes),
                    )
                  : "anterior"
              }
              parcial={isCurrentMonth}
            />
          ) : null}
        </div>
      </div>

      {/* Sub-KPIs em grade hierarquicamente menor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
        <SubKpi
          label="Líquido"
          value={formatBRL(current.liquido)}
          tone="primary"
        />
        <SubKpi
          label="Comissões"
          value={formatBRL(current.comissao)}
          tone="muted"
        />
        <SubKpi
          label="Vendas"
          value={String(current.quantidade)}
          tone="muted"
        />
        <SubKpi
          label="Ticket médio"
          value={formatBRL(current.ticketMedio)}
          tone="muted"
        />
      </div>
    </section>
  );
}

function previousMonthLabel(yyyyMM: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMM);
  if (!m) return "—";
  const y = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SubKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-1",
        tone === "primary"
          ? "border-primary/30 bg-primary/5"
          : "border-white/10 bg-card/40",
      )}
    >
      <p
        className={cn(
          "text-[10px] uppercase tracking-wide",
          tone === "primary" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-base sm:text-lg",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MoMBadge({
  pct,
  previousValue,
  previousLabel,
  parcial,
}: {
  pct: number | null;
  previousValue: number;
  previousLabel: string;
  parcial: boolean;
}) {
  // Sem dados no período anterior, mostra placeholder
  if (pct === null && previousValue === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        — sem dado em {previousLabel}
      </span>
    );
  }

  const sign = (pct ?? 0) > 0.05 ? "up" : (pct ?? 0) < -0.05 ? "down" : "flat";
  const Icon =
    sign === "up" ? ArrowUpRight : sign === "down" ? ArrowDownRight : Minus;
  const colorClass =
    sign === "up"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : sign === "down"
        ? "text-red-300 border-red-500/30 bg-red-500/10"
        : "text-muted-foreground border-white/10 bg-card/40";

  const pctFormatted = pct === null
    ? "—"
    : `${pct > 0 ? "+" : ""}${pct.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        colorClass,
      )}
      title={
        parcial
          ? "MÊS EM ANDAMENTO — COMPARAÇÃO PARCIAL"
          : `vs período anterior · ${formatBRL(previousValue)}`
      }
    >
      <Icon className="h-3 w-3" />
      <span>{pctFormatted}</span>
      <span className="text-muted-foreground font-normal hidden sm:inline">
        vs {formatBRL(previousValue)}
      </span>
    </span>
  );
}
