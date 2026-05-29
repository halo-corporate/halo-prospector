import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listVendas } from "@/lib/financeiro/queries";
import { currentMonthBR, formatBRL } from "@/lib/financeiro/format";
import {
  VENDA_RESPONSAVEIS,
  VENDA_STATUSES,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";
import { VendaFormDialog } from "@/components/financeiro/venda-form-dialog";
import { VendasFilters } from "@/components/financeiro/vendas-filters";
import { VendasTable } from "@/components/financeiro/vendas-table";

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
  const filters = {
    responsavel: isOneOf<VendaResponsavel>(
      searchParams.responsavel,
      [...VENDA_RESPONSAVEIS],
    ),
    status: isOneOf<VendaStatus>(searchParams.status, [...VENDA_STATUSES]),
    mes: mesParam === "_any_" || searchParams.mes === undefined && !mesParam
      ? undefined
      : mesParam,
    q: searchParams.q || undefined,
  };

  // `mes` default = mês atual; só não é "filtro ativo" no sentido de
  // empty state quando NÃO foi explicitamente escolhido pelo usuário e
  // não há outros filtros.
  const hasFiltersActive = Boolean(
    filters.responsavel ||
      filters.status ||
      filters.q ||
      searchParams.mes !== undefined,
  );

  const vendas = await listVendas(filters);

  // Totais visíveis (do que está filtrado)
  const totalBruto = vendas.reduce((s, v) => s + Number(v.valor_bruto || 0), 0);
  const totalLiquido = vendas.reduce(
    (s, v) => s + Number(v.valor_liquido || 0),
    0,
  );
  const totalComissao = vendas.reduce(
    (s, v) => s + Number(v.comissao_valor || 0),
    0,
  );

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="title-display text-2xl">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {vendas.length === 0
              ? "Registre vendas, comissões e pagamentos."
              : `${vendas.length} ${vendas.length === 1 ? "venda" : "vendas"} encontradas`}
          </p>
        </div>
        <VendaFormDialog mode="create" />
      </div>

      <VendasFilters
        defaults={{
          responsavel: filters.responsavel,
          status: filters.status,
          mes: filters.mes,
          q: filters.q,
        }}
      />

      {/* Totais do filtro atual (preview leve — DRE completo vem na sub-etapa 4.2) */}
      {vendas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-[18px] border border-white/10 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Faturamento bruto
            </p>
            <p className="font-mono text-xl">{formatBRL(totalBruto)}</p>
          </div>
          <div className="rounded-[18px] border border-primary/30 bg-primary/5 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-primary">
              Líquido
            </p>
            <p className="font-mono text-xl text-primary">
              {formatBRL(totalLiquido)}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Comissões
            </p>
            <p className="font-mono text-xl">{formatBRL(totalComissao)}</p>
          </div>
        </div>
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
