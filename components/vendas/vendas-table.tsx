"use client";

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
  VENDA_STATUS_LABELS,
  VENDA_CANAL_PAGAMENTO_LABELS,
  type Venda,
  type VendaStatus,
} from "@/lib/database.types";
import { formatBRL, formatDateBR } from "@/lib/format";

// Refino de forma do chip (mesmo token do CRM). Local pra manter a fatia
// self-contained (sem lib/vendas/badge.ts ainda).
const CHIP =
  "text-[10px] font-semibold tracking-[0.5px] px-2.5 py-[3px] rounded-lg";

/**
 * Cor do badge de status da venda: pago=verde, pendente=amarelo,
 * parcial=azul HALO, cancelado=cinza. Mesmo estilo dos badges de leads/propostas.
 */
function vendaStatusBadgeClass(s: VendaStatus): string {
  switch (s) {
    case "pago":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "pendente":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "parcial":
      return "bg-primary/15 text-primary border-primary/30";
    case "cancelado":
      return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
  }
}

export function VendasTable({ vendas }: { vendas: Venda[] }) {
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
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium text-white">
                {v.cliente}
              </TableCell>
              <TableCell className="text-right font-mono text-primary">
                {formatBRL(v.valor_liquido)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {v.quantidade}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border", CHIP, vendaStatusBadgeClass(v.status))}
                >
                  {VENDA_STATUS_LABELS[v.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {v.canal_pagamento
                  ? VENDA_CANAL_PAGAMENTO_LABELS[v.canal_pagamento]
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatDateBR(v.data_venda)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
