import { Receipt, Wallet, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVendasTotais, listVendas } from "@/lib/vendas/queries";
import { formatBRL } from "@/lib/format";
import { VendasTable } from "@/components/vendas/vendas-table";

export const metadata = { title: "Vendas — HALO Prospector" };
export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const [totais, vendas] = await Promise.all([
    getVendasTotais(),
    listVendas(),
  ]);

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="space-y-1">
        <p className="halo-eyebrow">Financeiro</p>
        <h1 className="title-display text-3xl sm:text-4xl">Vendas</h1>
        <p className="text-sm text-muted-foreground">
          Registro das vendas fechadas.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <VendaKpi
          icon={<Receipt className="h-4 w-4" />}
          label="Total vendido"
          value={formatBRL(totais.totalVendido)}
          sub={`${totais.countTotal} ${totais.countTotal === 1 ? "venda" : "vendas"}`}
        />
        <VendaKpi
          icon={<Wallet className="h-4 w-4" />}
          label="Total recebido"
          value={formatBRL(totais.totalRecebido)}
          sub={`${totais.countPagas} paga${totais.countPagas === 1 ? "" : "s"}`}
          accent="emerald"
        />
        <VendaKpi
          icon={<Clock className="h-4 w-4" />}
          label="A receber"
          value={formatBRL(totais.aReceber)}
          sub={`${totais.countPendentes} pendente${totais.countPendentes === 1 ? "" : "s"}`}
        />
      </div>

      {vendas.length === 0 ? (
        <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
          Nenhuma venda registrada ainda.
        </div>
      ) : (
        <VendasTable vendas={vendas} />
      )}
    </div>
  );
}

/**
 * KPI do topo — espelha o estilo do KpiCard do dashboard (rounded-halo + glass),
 * adaptado pra valor em moeda (string) + subtítulo de contagem.
 */
function VendaKpi({
  icon,
  label,
  value,
  sub,
  accent = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: "neutral" | "emerald";
}) {
  return (
    <div className="rounded-halo border border-white/10 bg-white/[0.04] backdrop-blur-[16px] p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "font-display font-bold text-2xl sm:text-3xl tracking-[0.02em]",
          accent === "emerald" && "text-emerald-300",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
