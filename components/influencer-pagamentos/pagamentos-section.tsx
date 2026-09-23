"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  PAGAMENTO_STATUS_LABELS,
  PAGAMENTO_TIPO_LABELS,
  type InfluencerPagamento,
} from "@/lib/database.types";
import {
  deletePagamentoAction,
  markPagamentoPagoAction,
} from "@/lib/influencer-pagamentos/actions";
import { pagamentoStatusBadgeClass } from "@/lib/influencers/badge";
import { formatBRL, formatDateBR } from "@/lib/format";
import { PagamentoFormDialog } from "./pagamento-form-dialog";

interface Props {
  influencerId: string;
  pagamentos: InfluencerPagamento[];
}

export function PagamentosSection({ influencerId, pagamentos }: Props) {
  const [pending, startTransition] = useTransition();

  function handleMarkPago(id: string) {
    startTransition(async () => {
      const res = await markPagamentoPagoAction(id, influencerId);
      if (!res.ok) toast.error(res.message);
      else toast.success("Marcado como pago");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deletePagamentoAction(id, influencerId);
      if (!res.ok) toast.error(res.message);
      else toast.success("Pagamento excluído");
    });
  }

  const totalPermuta = pagamentos
    .filter((p) => p.tipo === "permuta" && p.status !== "cancelado")
    .length;
  const totalPagoValor = pagamentos
    .filter((p) => p.tipo === "pago" && p.status === "pago")
    .reduce((acc, p) => acc + Number(p.valor ?? 0), 0);
  const totalPendenteValor = pagamentos
    .filter((p) => p.tipo === "pago" && p.status === "pendente")
    .reduce((acc, p) => acc + Number(p.valor ?? 0), 0);

  return (
    <div className="halo-glass rounded-halo p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
          Pagamentos / Permutas
        </p>
        <PagamentoFormDialog mode="create" influencerId={influencerId} />
      </div>

      {pagamentos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">
          Nenhum pagamento registrado.
        </p>
      ) : (
        <>
          {/* KPIs compactos */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Permutas
              </p>
              <p className="font-display font-bold text-lg">{totalPermuta}</p>
            </div>
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                R$ pago
              </p>
              <p className="font-mono text-sm text-emerald-300">
                {formatBRL(totalPagoValor)}
              </p>
            </div>
            <div className="rounded-md border border-white/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                R$ pendente
              </p>
              <p className="font-mono text-sm text-amber-300">
                {formatBRL(totalPendenteValor)}
              </p>
            </div>
          </div>

          {/* Lista */}
          <ul className="space-y-2">
            {pagamentos.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "group rounded-md border border-white/10 p-3 flex items-start justify-between gap-3 flex-wrap",
                  pending && "opacity-50",
                )}
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="border text-[10px] py-0"
                    >
                      {PAGAMENTO_TIPO_LABELS[p.tipo]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border text-[10px] py-0",
                        pagamentoStatusBadgeClass(p.status),
                      )}
                    >
                      {PAGAMENTO_STATUS_LABELS[p.status]}
                    </Badge>
                    {p.tipo === "pago" ? (
                      <span className="font-mono font-semibold text-sm text-primary">
                        {formatBRL(p.valor)}
                      </span>
                    ) : null}
                  </div>
                  {p.tipo === "permuta" && p.descricao_permuta ? (
                    <p className="text-xs text-foreground/90">
                      {p.descricao_permuta}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    Combinada em {formatDateBR(p.data_combinada)}
                    {p.data_pago
                      ? ` · paga em ${formatDateBR(p.data_pago)}`
                      : ""}
                  </p>
                  {p.observacoes ? (
                    <p className="text-[11px] text-muted-foreground/80">
                      {p.observacoes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.status === "pendente" ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:text-emerald-300"
                      title="Marcar como pago"
                      onClick={() => handleMarkPago(p.id)}
                      disabled={pending}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  ) : null}
                  <PagamentoFormDialog
                    mode="edit"
                    influencerId={influencerId}
                    pagamento={p}
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
                        <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esse registro vai ser removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(p.id);
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
