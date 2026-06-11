import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listLeads, type LeadOrderBy } from "@/lib/leads/queries";
import { listVerticais } from "@/lib/verticais/queries";
import { fetchPrimaryDecisorMap } from "@/lib/decisores/queries";
import { fetchLastInteracaoMap } from "@/lib/interacoes/queries";
import type { LeadStatus, LeadTemperatura } from "@/lib/database.types";
import { LeadsFilters } from "./filters";
import { LeadsTable } from "./leads-table";

interface SearchParams {
  vertical?: string;
  status?: string;
  temperatura?: string;
  estado?: string;
  cidade?: string;
  q?: string;
  orderBy?: string;
  orderDir?: string;
}

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

  // Enriquece em batch: D1 (decisor primário) e última interação por lead.
  const leadIds = leads.map((l) => l.id);
  const [d1Map, lastInteracaoMap] = await Promise.all([
    fetchPrimaryDecisorMap(leadIds),
    fetchLastInteracaoMap(leadIds),
  ]);

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
        <Button asChild>
          <Link href="/crm/novo">+ Novo lead</Link>
        </Button>
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

      <LeadsTable
        leads={leads}
        verticais={verticais.map((v) => ({ slug: v.slug, label: v.label }))}
        d1Map={Object.fromEntries(d1Map)}
        lastInteracaoMap={Object.fromEntries(lastInteracaoMap)}
        orderBy={filters.orderBy}
        orderDir={filters.orderDir}
      />
    </div>
  );
}
