"use client";

import { useTransition } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  LINK_TIPO_LABELS,
  type Link as LinkRow,
  type LinkTipo,
} from "@/lib/database.types";
import { iconForTipo } from "@/lib/links/icons";
import { deleteLinkAction } from "@/lib/links/actions";
import { LinkFormDialog } from "./link-form-dialog";

function hostnameSafe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface Props {
  link: LinkRow;
}

export function LinkCard({ link }: Props) {
  const [pending, startTransition] = useTransition();
  const Icon = iconForTipo(link.tipo);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteLinkAction(link.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  return (
    <div
      className={cn(
        "group relative rounded-[18px] border border-white/10 bg-card/40 p-4 transition-colors hover:border-white/20 hover:bg-card/70 flex flex-col gap-3 min-h-[140px]",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header: ícone + tipo + ações hover */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
            {LINK_TIPO_LABELS[link.tipo as LinkTipo] ?? link.tipo}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <LinkFormDialog mode="edit" link={link} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir link"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{link.titulo}</strong> vai
                  ser removido permanentemente.
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

      {/* Conteúdo */}
      <div className="flex-1 space-y-1 min-w-0">
        <h3 className="font-display font-bold uppercase tracking-[0.04em] text-sm leading-tight truncate">
          {link.titulo}
        </h3>
        {link.descricao ? (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            {link.descricao}
          </p>
        ) : null}
      </div>

      {/* Footer: URL + abrir */}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 text-[11px] text-primary hover:text-primary/80 transition-colors min-w-0 mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate flex-1 font-mono">
          {hostnameSafe(link.url)}
        </span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}
