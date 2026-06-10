"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { InfluencerVenda } from "@/lib/database.types";
import { deleteVendaAction } from "@/lib/influencer-vendas/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { VendaFormDialog } from "./venda-form-dialog";

interface Props {
  influencerId: string;
  vendas: InfluencerVenda[];
}

export function VendasSection({ influencerId, vendas }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteVendaAction(id, influencerId);
      if (!res.ok) toast.error(res.message);
      else toast.success("Venda excluída");
    });
  }

  const totalVendas = vendas.length;
  const totalUnidades = vendas.reduce(
    (acc, v) => acc + Number(v.quantidade ?? 0),
    0,
  );
  const totalFaturado = vendas.reduce(
    (acc, v) => acc + Number(v.valor_total ?? 0),
    0,
  );
  const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;

  return (
    <div className="halo-glass rounded-halo p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
          Vendas por código
        </p>
        <VendaFormDialog mode="create" influencerId={influencerId} />
      </div>

      {vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">
          Nenhuma venda registrada. Adicione manualmente conforme as vendas pelo
          código entram.
        </p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Vendas
              </p>
              <p className="font-display font-bold text-lg">{totalVendas}</p>
            </div>
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Unidades
              </p>
              <p className="font-display font-bold text-lg">{totalUnidades}</p>
            </div>
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Faturado
              </p>
              <p className="font-mono text-sm text-emerald-300">
                {formatBRL(totalFaturado)}
              </p>
            </div>
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Ticket médio
              </p>
              <p className="font-mono text-sm text-primary">
                {formatBRL(ticketMedio)}
              </p>
            </div>
          </div>

          {/* Lista */}
          <ul className="space-y-2">
            {vendas.map((v) => (
              <li
                key={v.id}
                className={cn(
                  "group rounded-md border border-white/10 p-3 flex items-start justify-between gap-3 flex-wrap",
                  pending && "opacity-50",
                )}
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-primary">
                      {formatBRL(v.valor_total)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {v.quantidade}{" "}
                      {v.quantidade === 1 ? "unidade" : "unidades"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateBR(v.data_venda)}
                    </span>
                  </div>
                  {v.comprador_nome ? (
                    <p className="text-xs text-foreground/90 truncate">
                      {v.comprador_nome}
                    </p>
                  ) : null}
                  {v.observacoes ? (
                    <p className="text-[11px] text-muted-foreground/80">
                      {v.observacoes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <VendaFormDialog
                    mode="edit"
                    influencerId={influencerId}
                    venda={v}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:text-destructive"
                        disabled={pending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esse registro vai ser removido permanentemente.
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
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
