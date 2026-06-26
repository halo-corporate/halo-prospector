"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INTERACAO_CANAL_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  readLeadVerticais,
  verticalLabel,
  type Lead,
  type InteracaoCanal,
} from "@/lib/database.types";
import { CHIP_FORM, statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, formatBRHuman, isOverdueBR } from "@/lib/timezone";

type OrderBy = "updated_at" | "created_at" | "empresa" | "proximo_followup";

interface LastInteracao {
  canal: string;
  data_hora: string;
}

interface Props {
  leads: Lead[];
  verticais: { slug: string; label: string }[];
  /** Map<lead_id, nome_d1>. Vem do server (enriquecimento da listLeads). */
  d1Map: Record<string, string>;
  /** Map<lead_id, {canal, data_hora}> da última interação. */
  lastInteracaoMap: Record<string, LastInteracao>;
  orderBy: OrderBy;
  orderDir: "asc" | "desc";
}

export function LeadsTable({
  leads,
  verticais,
  d1Map,
  lastInteracaoMap,
  orderBy,
  orderDir,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function toggleSort(key: OrderBy) {
    const next = new URLSearchParams(params.toString());
    if (orderBy === key) {
      next.set("orderDir", orderDir === "asc" ? "desc" : "asc");
    } else {
      next.set("orderBy", key);
      next.set("orderDir", "desc");
    }
    router.push(`/crm?${next.toString()}`);
  }

  function SortIcon({ k }: { k: OrderBy }) {
    if (orderBy !== k)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return orderDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  if (leads.length === 0) {
    return (
      <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
        Nenhum lead encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div
      className="halo-glass rounded-halo overflow-hidden"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        transform: "translateZ(0)",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort("empresa")}
            >
              Empresa
              <SortIcon k="empresa" />
            </TableHead>
            <TableHead>Vertical</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Temp.</TableHead>
            <TableHead>D1</TableHead>
            <TableHead>Última interação</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort("proximo_followup")}
            >
              Follow-up
              <SortIcon k="proximo_followup" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort("updated_at")}
            >
              Atualizado
              <SortIcon k="updated_at" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const d1 = d1Map[lead.id];
            const last = lastInteracaoMap[lead.id];
            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => router.push(`/crm/${lead.id}`)}
              >
                <TableCell className="font-medium text-white">{lead.empresa}</TableCell>
                <TableCell className="text-muted-foreground">
                  {(() => {
                    const slugs = readLeadVerticais(lead);
                    if (slugs.length === 0) return "—";
                    return slugs
                      .map((s) => verticalLabel(s, verticais))
                      .join(" · ");
                  })()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[lead.cidade, lead.estado].filter(Boolean).join("/") || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border", CHIP_FORM, statusBadgeClass(lead.status))}
                  >
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.temperatura ? (
                    <Badge
                      variant="outline"
                      className={cn(CHIP_FORM, temperaturaBadgeClass(lead.temperatura))}
                    >
                      {LEAD_TEMPERATURA_LABELS[lead.temperatura]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[140px]">
                  {d1 ?? "—"}
                </TableCell>
                <TableCell
                  className="text-muted-foreground whitespace-nowrap"
                  title={last ? formatBR(last.data_hora) : ""}
                >
                  {last
                    ? `${INTERACAO_CANAL_LABELS[last.canal as InteracaoCanal] ?? last.canal} · ${formatBRHuman(last.data_hora)}`
                    : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-muted-foreground whitespace-nowrap",
                    lead.proximo_followup &&
                      isOverdueBR(lead.proximo_followup) &&
                      "text-red-400 font-medium",
                  )}
                >
                  {lead.proximo_followup
                    ? formatBR(lead.proximo_followup, "dd/MM HH:mm")
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatBR(lead.updated_at, "dd/MM HH:mm")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
