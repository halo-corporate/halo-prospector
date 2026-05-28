import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listLeads, type LeadOrderBy } from "@/lib/leads/queries";
import type {
  LeadVertical,
  LeadStatus,
  LeadTemperatura,
} from "@/lib/database.types";
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

const VALID_VERTICALS: LeadVertical[] = [
  "clinicas_medicas",
  "academias",
  "wellness",
  "corporativo",
  "turismo_sono",
];
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

export const dynamic = "force-dynamic";

export default async function LeadsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    vertical: isOneOf(searchParams.vertical, VALID_VERTICALS),
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

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        <Button asChild>
          <Link href="/leads/novo">+ Novo lead</Link>
        </Button>
      </div>

      <LeadsFilters
        defaults={{
          vertical: filters.vertical,
          status: filters.status,
          temperatura: filters.temperatura,
          estado: filters.estado,
          q: filters.q,
        }}
      />

      <LeadsTable
        leads={leads}
        orderBy={filters.orderBy}
        orderDir={filters.orderDir}
      />
    </div>
  );
}
