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
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  verticalLabel,
  type Lead,
} from "@/lib/database.types";
import { statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, isOverdueBR } from "@/lib/timezone";

type OrderBy = "updated_at" | "created_at" | "empresa" | "proximo_followup";

const SORTABLE: { key: OrderBy; label: string }[] = [
  { key: "empresa", label: "Empresa" },
  { key: "updated_at", label: "Atualizado" },
  { key: "proximo_followup", label: "Follow-up" },
];

interface Props {
  leads: Lead[];
  verticais: { slug: string; label: string }[];
  orderBy: OrderBy;
  orderDir: "asc" | "desc";
}

export function LeadsTable({ leads, verticais, orderBy, orderDir }: Props) {
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
    router.push(`/leads?${next.toString()}`);
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
      <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
        Nenhum lead encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {SORTABLE.slice(0, 1).map((c) => (
              <TableHead
                key={c.key}
                className="cursor-pointer select-none"
                onClick={() => toggleSort(c.key)}
              >
                {c.label}
                <SortIcon k={c.key} />
              </TableHead>
            ))}
            <TableHead>Vertical</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Temp.</TableHead>
            <TableHead>D1</TableHead>
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
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <TableCell className="font-medium">{lead.empresa}</TableCell>
              <TableCell className="text-muted-foreground">
                {verticalLabel(lead.vertical, verticais)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {[lead.cidade, lead.estado].filter(Boolean).join("/") || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border", statusBadgeClass(lead.status))}
                >
                  {LEAD_STATUS_LABELS[lead.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {lead.temperatura ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      temperaturaBadgeClass(lead.temperatura),
                    )}
                  >
                    {LEAD_TEMPERATURA_LABELS[lead.temperatura]}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell
                className={cn(
                  "text-muted-foreground",
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
