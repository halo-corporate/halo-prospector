"use client";

import { useTransition } from "react";
import { Lock, LockOpen, Trash2 } from "lucide-react";
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
import { CopyButton } from "@/components/mensagens/copy-button";
import type { Informacao } from "@/lib/database.types";
import { deleteInformacaoAction } from "@/lib/informacoes/actions";
import { SecretReveal } from "./secret-reveal";
import { InfoFormDialog } from "./info-form-dialog";

interface Props {
  info: Informacao;
}

export function InfoCard({ info }: Props) {
  const [pending, startTransition] = useTransition();
  const hasSecret = Boolean(info.valor_secreto);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteInformacaoAction(info.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  const Icon = hasSecret ? Lock : LockOpen;

  return (
    <div
      className={cn(
        "group halo-glass rounded-halo p-4 flex flex-col gap-2",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header: icon + titulo + acoes */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={cn(
              "h-9 w-9 rounded-md border flex items-center justify-center shrink-0",
              hasSecret
                ? "bg-primary/10 border-primary/25"
                : "bg-muted/40 border-white/10",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                hasSecret ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          <h3 className="font-display font-bold uppercase tracking-[0.04em] text-sm leading-tight truncate flex-1">
            {info.titulo}
          </h3>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <InfoFormDialog mode="edit" info={info} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir informação?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{info.titulo}</strong> vai
                  ser removida permanentemente
                  {hasSecret ? " (inclusive o valor secreto)" : ""}.
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

      {/* Valor publico */}
      <div className="flex items-center gap-1.5 min-w-0">
        <code className="flex-1 min-w-0 truncate font-mono text-xs text-foreground">
          {info.valor}
        </code>
        <CopyButton text={info.valor} label="" className="h-6 w-6" />
      </div>

      {/* Valor secreto (mascarado) */}
      {hasSecret ? <SecretReveal value={info.valor_secreto!} /> : null}

      {/* Observacoes */}
      {info.observacoes ? (
        <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-wrap">
          {info.observacoes}
        </p>
      ) : null}
    </div>
  );
}
