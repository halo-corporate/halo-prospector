import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPropostas } from "@/lib/propostas/queries";
import {
  PROPOSTA_STATUSES,
  type PropostaStatus,
} from "@/lib/database.types";
import { PropostaCard } from "@/components/propostas/proposta-card";
import { PropostaFormDialog } from "@/components/propostas/proposta-form-dialog";
import { PropostasFilters } from "@/components/propostas/propostas-filters";

export const metadata = { title: "Propostas — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  q?: string;
  valor_min?: string;
  valor_max?: string;
  data_inicio?: string;
  data_fim?: string;
}

function isOneOf<T extends string>(
  v: string | undefined,
  list: T[],
): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

function parseNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const cleaned = s.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    status: isOneOf<PropostaStatus>(searchParams.status, [...PROPOSTA_STATUSES]),
    q: searchParams.q || undefined,
    valorMin: parseNum(searchParams.valor_min),
    valorMax: parseNum(searchParams.valor_max),
    dataInicio: searchParams.data_inicio || undefined,
    dataFim: searchParams.data_fim || undefined,
  };

  const propostas = await listPropostas(filters);

  const hasFiltersActive = Boolean(
    filters.status ||
      filters.q ||
      filters.valorMin !== undefined ||
      filters.valorMax !== undefined ||
      filters.dataInicio ||
      filters.dataFim,
  );

  // KPI rápido: contagem por status
  const byStatus = new Map<PropostaStatus, number>();
  for (const p of propostas) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  }

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Propostas</p>
          <h1 className="title-display text-3xl sm:text-4xl">Propostas</h1>
          <p className="text-sm text-muted-foreground">
            {propostas.length === 0 && !hasFiltersActive
              ? "Acompanhe o fluxo de propostas e converta em venda com 1 clique."
              : `${propostas.length} ${propostas.length === 1 ? "proposta" : "propostas"} encontradas`}
          </p>
        </div>
        <PropostaFormDialog mode="create" />
      </div>

      <PropostasFilters
        defaults={{
          status: filters.status,
          q: filters.q,
          valorMin: searchParams.valor_min,
          valorMax: searchParams.valor_max,
          dataInicio: searchParams.data_inicio,
          dataFim: searchParams.data_fim,
        }}
      />

      {/* KPIs rápidos por status */}
      {propostas.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROPOSTA_STATUSES.map((s) => (
            <div
              key={s}
              className="halo-glass rounded-halo p-3 space-y-0.5"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {s === "negociacao"
                  ? "Negociação"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </p>
              <p className="font-display font-bold text-2xl tracking-[0.02em]">
                {byStatus.get(s) ?? 0}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {propostas.length === 0 ? (
        hasFiltersActive ? (
          <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
            Nenhuma proposta encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhuma proposta registrada
              </h2>
              <p className="text-sm text-muted-foreground">
                Registre as propostas que você manda. Quando o cliente
                aceitar, é 1 clique pra virar venda no Financeiro.
              </p>
            </div>
            <PropostaFormDialog
              mode="create"
              trigger={
                <Button size="sm">
                  <FileText className="h-3.5 w-3.5" />
                  Criar primeira proposta
                </Button>
              }
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {propostas.map((p) => (
            <PropostaCard key={p.id} proposta={p} />
          ))}
        </div>
      )}
    </div>
  );
}
