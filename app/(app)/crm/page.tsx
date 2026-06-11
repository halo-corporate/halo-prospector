import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listLeads, type LeadOrderBy } from "@/lib/leads/queries";
import { listVerticais } from "@/lib/verticais/queries";
import { fetchPrimaryDecisorMap } from "@/lib/decisores/queries";
import { fetchLastInteracaoMap } from "@/lib/interacoes/queries";
import type { LeadStatus, LeadTemperatura } from "@/lib/database.types";
import { LeadsFilters } from "./filters";
import { LeadsTable } from "./leads-table";
import { LeadsBoard } from "./board";

interface SearchParams {
  vertical?: string;
  status?: string;
  temperatura?: string;
  estado?: string;
  cidade?: string;
  q?: string;
  orderBy?: string;
  orderDir?: string;
  view?: string;
}

type View = "table" | "board";

const VALID_STATUS: LeadStatus[] = [
  "novo",
  "pesquisando",
  "tentativa_contato",
  "em_qualificacao",
  "aquecido",
  "passado_closer",
  "ganho",
  "perdido",
  "descartado",
];
const VALID_TEMP: LeadTemperatura[] = ["frio", "morno", "quente"];
const VALID_ORDER_BY: LeadOrderBy[] = [
  "updated_at",
  "created_at",
  "empresa",
  "proximo_followup",
];

function isOneOf<T extends string>(v: string | undefined, list: T[]): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

/** Parseia CSV "a,b,c" → ["a","b","c"], filtrado pelos slugs válidos. */
function parseVerticaisCsv(raw: string | undefined, validSlugs: string[]): string[] {
  if (!raw) return [];
  const valid = new Set(validSlugs);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && valid.has(s));
}

export const dynamic = "force-dynamic";

export default async function LeadsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const verticais = await listVerticais();
  const validVerticalSlugs = verticais.map((v) => v.slug);

  const verticaisFilter = parseVerticaisCsv(
    searchParams.vertical,
    validVerticalSlugs,
  );

  const filters = {
    verticais: verticaisFilter.length > 0 ? verticaisFilter : undefined,
    status: isOneOf(searchParams.status, VALID_STATUS),
    temperatura: isOneOf(searchParams.temperatura, VALID_TEMP),
    estado: searchParams.estado || undefined,
    cidade: searchParams.cidade || undefined,
    q: searchParams.q || undefined,
    orderBy: isOneOf(searchParams.orderBy, VALID_ORDER_BY) ?? "updated_at",
    orderDir:
      searchParams.orderDir === "asc" ? ("asc" as const) : ("desc" as const),
  };

  const leads = await listLeads(filters);
  const view: View = searchParams.view === "board" ? "board" : "table";

  // Enriquece em batch: D1 (decisor primário) e última interação por lead.
  const leadIds = leads.map((l) => l.id);
  const [d1Map, lastInteracaoMap] = await Promise.all([
    fetchPrimaryDecisorMap(leadIds),
    fetchLastInteracaoMap(leadIds),
  ]);

  // Preserva os filtros atuais ao trocar de view (não perde estado).
  function viewHref(target: View): string {
    const params = new URLSearchParams();
    if (filters.verticais && filters.verticais.length > 0) {
      params.set("vertical", filters.verticais.join(","));
    }
    if (filters.status) params.set("status", filters.status);
    if (filters.temperatura) params.set("temperatura", filters.temperatura);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.cidade) params.set("cidade", filters.cidade);
    if (filters.q) params.set("q", filters.q);
    if (target === "board") params.set("view", "board");
    // tabela é default; omite view=table pra URL limpa
    const qs = params.toString();
    return qs ? `/crm?${qs}` : "/crm";
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="halo-eyebrow">CRM</p>
          <h1 className="title-display text-3xl sm:text-4xl">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Tabela / Board — preserva filtros */}
          <div
            className="inline-flex rounded-md border border-white/10 bg-white/[0.04] p-0.5"
            role="tablist"
            aria-label="Visualização"
          >
            <Link
              href={viewHref("table")}
              role="tab"
              aria-selected={view === "table"}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors",
                view === "table"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
              Tabela
            </Link>
            <Link
              href={viewHref("board")}
              role="tab"
              aria-selected={view === "board"}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors",
                view === "board"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </Link>
          </div>
          <Button asChild>
            <Link href="/crm/novo">+ Novo lead</Link>
          </Button>
        </div>
      </div>

      <LeadsFilters
        verticais={verticais.map((v) => ({ slug: v.slug, label: v.label }))}
        defaults={{
          verticais: filters.verticais,
          status: filters.status,
          temperatura: filters.temperatura,
          estado: filters.estado,
          q: filters.q,
        }}
      />

      {view === "board" ? (
        <LeadsBoard
          leads={leads}
          d1Map={Object.fromEntries(d1Map)}
          lastInteracaoMap={Object.fromEntries(lastInteracaoMap)}
        />
      ) : (
        <LeadsTable
          leads={leads}
          verticais={verticais.map((v) => ({ slug: v.slug, label: v.label }))}
          d1Map={Object.fromEntries(d1Map)}
          lastInteracaoMap={Object.fromEntries(lastInteracaoMap)}
          orderBy={filters.orderBy}
          orderDir={filters.orderDir}
        />
      )}
    </div>
  );
}
