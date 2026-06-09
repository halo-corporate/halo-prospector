"use client";

import { useTransition } from "react";
import { Calendar, Trash2, Truck } from "lucide-react";
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
  PROPOSTA_STATUS_LABELS,
  type Embalagem,
  type Influencer,
  type Proposta,
} from "@/lib/database.types";
import { propostaStatusBadgeClass } from "@/lib/propostas/badge";
import { deletePropostaAction } from "@/lib/propostas/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { EnvioFormDialog } from "@/components/envios/envio-form-dialog";
import { PropostaFormDialog } from "./proposta-form-dialog";

function daysSince(iso: string): number {
  const d = new Date(iso);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

interface Props {
  proposta: Proposta;
  embalagens: Pick<Embalagem, "id" | "nome">[];
  influencers: Pick<Influencer, "id" | "nome">[];
  enviosCount: number;
}

export function PropostaCard({
  proposta,
  embalagens,
  influencers,
  enviosCount,
}: Props) {
  const [pending, startTransition] = useTransition();
  const dias = daysSince(proposta.data_envio);

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePropostaAction(proposta.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  const isClosed =
    proposta.status === "convertido" || proposta.status === "recusado";

  return (
    <div
      className={cn(
        "group halo-glass rounded-halo p-4 flex flex-col gap-3",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header: status + ações */}
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "border text-[10px] py-0",
            propostaStatusBadgeClass(proposta.status),
          )}
        >
          {PROPOSTA_STATUS_LABELS[proposta.status]}
        </Badge>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <PropostaFormDialog mode="edit" proposta={proposta} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir proposta"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{proposta.titulo}</strong>
                  {" "}vai ser removida permanentemente.
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
      </div>

      {/* Título + cliente */}
      <div className="space-y-0.5 min-w-0">
        <h3 className="font-display font-bold uppercase tracking-[0.04em] text-sm leading-tight truncate">
          {proposta.titulo}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {proposta.cliente}
        </p>
      </div>

      {/* Valores */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="font-mono font-semibold text-xl text-primary">
          {formatBRL(proposta.valor_total)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {proposta.quantidade} × {formatBRL(proposta.valor_unitario)}
        </p>
      </div>

      {/* Descrição (truncada) */}
      {proposta.descricao ? (
        <p className="text-xs text-foreground/80 leading-snug line-clamp-3">
          {proposta.descricao}
        </p>
      ) : null}

      {/* Motivo da recusa */}
      {proposta.status === "recusado" && proposta.motivo_recusa ? (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-[11px] text-red-200/90">
          <span className="uppercase tracking-wide text-[9px] text-red-300">
            Motivo da recusa:
          </span>{" "}
          {proposta.motivo_recusa}
        </div>
      ) : null}

      {/* Footer: datas + ações */}
      <div className="flex items-center justify-between gap-2 flex-wrap mt-auto pt-1 border-t border-white/5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateBR(proposta.data_envio)}
          {!isClosed ? (
            <span className="text-muted-foreground/60">· {dias}d aberta</span>
          ) : proposta.data_resposta ? (
            <span className="text-muted-foreground/60">
              · respondida em {formatDateBR(proposta.data_resposta)}
            </span>
          ) : null}
        </span>

        <div className="inline-flex items-center gap-1.5">
          {enviosCount > 0 ? (
            <Badge
              variant="outline"
              className="border text-[10px] py-0 border-primary/30 bg-primary/10 text-primary"
            >
              <Truck className="h-3 w-3" />
              {enviosCount} {enviosCount === 1 ? "envio" : "envios"}
            </Badge>
          ) : null}
          <EnvioFormDialog
            mode="create"
            embalagens={embalagens}
            influencers={influencers}
            prefill={{
              destinatarioNome: proposta.cliente,
              propostaId: proposta.id,
            }}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
              >
                <Truck className="h-3 w-3" />
                Criar envio
              </Button>
            }
          />
        </div>
      </div>

    </div>
  );
}
