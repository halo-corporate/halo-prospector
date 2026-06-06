import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBreakdownByResponsavel,
  getBreakdownByStatus,
  getVendasAggregate,
  listVendas,
} from "@/lib/financeiro/queries";
import { currentMonthBR, previousMonth } from "@/lib/financeiro/format";
import {
  VENDA_RESPONSAVEIS,
  VENDA_STATUSES,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";
import { VendaFormDialog } from "@/components/financeiro/venda-form-dialog";
import { VendasFilters } from "@/components/financeiro/vendas-filters";
import { VendasTable } from "@/components/financeiro/vendas-table";
import { DREPanel } from "@/components/financeiro/dre-panel";
import { BreakdownPanel } from "@/components/financeiro/breakdown-panel";
import { ExportPdfButton } from "@/components/financeiro/export-pdf-button";

export const metadata = { title: "Financeiro — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  responsavel?: string;
  status?: string;
  mes?: string;
  q?: string;
}

function isOneOf<T extends string>(v: string | undefined, list: T[]): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Default: mês atual. User pode escolher outro ou "Todos" no filtro.
  const mesParam = searchParams.mes ?? currentMonthBR();
  const mesFilter =
    mesParam === "_any_" || (searchParams.mes === undefined && !mesParam)
      ? undefined
      : mesParam;

  const filters = {
    responsavel: isOneOf<VendaResponsavel>(
      searchParams.responsavel,
      [...VENDA_RESPONSAVEIS],
    ),
    status: isOneOf<VendaStatus>(searchParams.status, [...VENDA_STATUSES]),
    mes: mesFilter,
    q: searchParams.q || undefined,
  };

  const hasFiltersActive = Boolean(
    filters.responsavel ||
      filters.status ||
      filters.q ||
      searchParams.mes !== undefined,
  );

  // Para o MoM: se temos um mês definido, calcula aggregate do mês anterior
  // usando os MESMOS outros filtros (compare apples to apples).
  const prevMes = filters.mes ? previousMonth(filters.mes) : null;

  const [vendas, currentAgg, prevAgg, respBreakdown, statusBreakdown] =
    await Promise.all([
      listVendas(filters),
      getVendasAggregate(filters),
      prevMes
        ? getVendasAggregate({ ...filters, mes: prevMes })
        : Promise.resolve(null),
      getBreakdownByResponsavel(filters),
      getBreakdownByStatus(filters),
    ]);

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Financeiro</p>
          <h1 className="title-display text-2xl">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {vendas.length === 0
              ? "Registre vendas, comissões e pagamentos."
              : `${vendas.length} ${vendas.length === 1 ? "venda" : "vendas"} encontradas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportPdfButton />
          <VendaFormDialog mode="create" />
        </div>
      </div>

      <VendasFilters
        defaults={{
          responsavel: filters.responsavel,
          status: filters.status,
          mes: filters.mes,
          q: filters.q,
        }}
      />

      {/* DRE — só mostra quando há dados (evita painel vazio gigante) */}
      {currentAgg.quantidade > 0 ? (
        <DREPanel
          mes={filters.mes ?? null}
          current={currentAgg}
          previous={prevAgg}
        />
      ) : null}

      {/* Breakdowns — também só com dados */}
      {currentAgg.quantidade > 0 ? (
        <BreakdownPanel
          responsaveis={respBreakdown}
          statuses={statusBreakdown}
          totalLiquido={currentAgg.liquido}
        />
      ) : null}

      {vendas.length === 0 ? (
        // Distingue "filtros vazios" (filtros ativos, sem match) de
        // "banco vazio" (sem filtros, sem dados): CTA grande só quando
        // realmente não há venda nenhuma.
        hasFiltersActive ? (
          <div className="rounded-[18px] border border-white/10 p-12 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhuma venda registrada
              </h2>
              <p className="text-sm text-muted-foreground">
                Comece registrando suas vendas. Bruto, líquido e comissão são
                calculados automaticamente a partir de quantidade × valor unitário.
              </p>
            </div>
            <VendaFormDialog
              mode="create"
              trigger={
                <Button size="sm">
                  <Wallet className="h-3.5 w-3.5" />
                  Registrar primeira venda
                </Button>
              }
            />
          </div>
        )
      ) : (
        <VendasTable vendas={vendas} />
      )}
    </div>
  );
}
