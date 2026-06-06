"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
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
import {
  VENDA_RESPONSAVEL_LABELS,
  VENDA_STATUS_LABELS,
  type Venda,
  type VendaStatus,
} from "@/lib/database.types";
import { deleteVendaAction } from "@/lib/financeiro/actions";
import { formatBRL, formatDateBR, formatPercent } from "@/lib/financeiro/format";
import { VendaFormDialog } from "./venda-form-dialog";
import { ComprovanteCell } from "./comprovante-cell";

function statusBadgeClass(s: VendaStatus): string {
  switch (s) {
    case "pago":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "parcial":
      return "bg-primary/15 text-primary border-primary/30";
    case "pendente":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "cancelado":
      return "bg-red-500/15 text-red-300 border-red-500/30";
  }
}

interface Props {
  vendas: Venda[];
}

export function VendasTable({ vendas }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteVendaAction(id);
      if (!res.ok) toast.error(res.message);
    });
  }

  if (vendas.length === 0) {
    return (
      <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
        Nenhuma venda encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="halo-glass rounded-halo overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Unit.</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead>Resp.</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center w-[110px]">Comprovante</TableHead>
            <TableHead className="text-right w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((v) => (
            <TableRow
              key={v.id}
              className={cn("group/row", pending && "opacity-50")}
            >
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateBR(v.data_venda)}
              </TableCell>
              <TableCell className="font-medium max-w-[200px] truncate">
                {v.cliente}
              </TableCell>
              <TableCell className="text-right text-xs">
                {v.quantidade}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {formatBRL(v.valor_unitario)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-medium">
                {formatBRL(v.valor_liquido)}
              </TableCell>
              <TableCell className="text-xs">
                {VENDA_RESPONSAVEL_LABELS[v.responsavel]}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs">
                  <span className="text-muted-foreground">
                    {formatPercent(v.comissao_percentual)}
                  </span>
                  <span className="font-mono">
                    {formatBRL(v.comissao_valor)}
                  </span>
                  {v.comissao_paga ? (
                    <Check
                      className="h-3 w-3 text-emerald-400"
                      aria-label="Comissão paga"
                    />
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "border text-[10px] py-0",
                    statusBadgeClass(v.status),
                  )}
                >
                  {VENDA_STATUS_LABELS[v.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <ComprovanteCell
                    vendaId={v.id}
                    comprovanteUrl={v.comprovante_url}
                  />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <VendaFormDialog mode="edit" venda={v} />
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
                          Venda de{" "}
                          <strong className="text-foreground">
                            {v.cliente}
                          </strong>{" "}
                          ({formatBRL(v.valor_liquido)}) vai ser removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(v.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
