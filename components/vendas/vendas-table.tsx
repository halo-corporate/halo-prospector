"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  VENDA_STATUS_LABELS,
  VENDA_CANAL_PAGAMENTO_LABELS,
  type Venda,
  type VendaStatus,
} from "@/lib/database.types";
import { formatBRL, formatDateBR } from "@/lib/format";
import { deleteVenda } from "@/lib/vendas/actions";
import { VendaFormDialog } from "./venda-form-dialog";

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
            <TableHead className="text-right">Ações</TableHead>
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
              <TableCell className="text-right">
                <RowActions venda={v} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Ações por linha: editar (abre o dialog preenchido) e apagar (confirmação).
 * Espelha o padrão de edit/delete do proposta-card.
 */
function RowActions({ venda }: { venda: Venda }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteVenda(venda.id);
      if (!res.ok) toast.error(res.message);
      // Sucesso: revalidatePath na action atualiza a lista.
    });
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <VendaFormDialog mode="edit" venda={venda} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:text-destructive"
            disabled={pending}
            aria-label="Excluir venda"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda de{" "}
              <strong className="text-foreground">{venda.cliente}</strong> vai
              ser removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
