"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteTarefaAction,
  toggleTarefaAction,
  updateTarefaTextoAction,
} from "@/lib/tarefas/actions";
import type { TarefaSemanal } from "@/lib/database.types";

interface Props {
  tarefa: TarefaSemanal;
  /** Se true, esconde botão de editar/excluir (modo compacto pro dashboard). */
  compact?: boolean;
}

export function ChecklistItem({ tarefa, compact = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tarefa.texto);

  function handleToggle() {
    // Otimismo controlado: NÃO mudamos o estado local — o revalidatePath
    // re-renderiza após o sucesso (regra do projeto: banco = fonte da verdade).
    startTransition(async () => {
      const res = await toggleTarefaAction(tarefa.id, !tarefa.concluida);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTarefaAction(tarefa.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleSaveEdit() {
    const t = draft.trim();
    if (!t || t === tarefa.texto) {
      setEditing(false);
      setDraft(tarefa.texto);
      return;
    }
    startTransition(async () => {
      const res = await updateTarefaTextoAction(tarefa.id, t);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setEditing(false);
    });
  }

  function handleCancelEdit() {
    setEditing(false);
    setDraft(tarefa.texto);
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 -mx-2 transition-colors",
        !editing && "hover:border-border hover:bg-accent/30",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending || editing}
        aria-label={tarefa.concluida ? "Marcar como pendente" : "Marcar como concluída"}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
          tarefa.concluida
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-foreground",
          pending && "opacity-50",
        )}
      >
        {tarefa.concluida ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </button>

      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleCancelEdit();
              }
            }}
            autoFocus
            maxLength={200}
            className="h-7 text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleSaveEdit}
            disabled={pending}
            aria-label="Salvar"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleCancelEdit}
            disabled={pending}
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "flex-1 text-sm leading-snug",
              tarefa.concluida && "line-through text-muted-foreground",
            )}
          >
            {tarefa.texto}
          </p>
          {!compact ? (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setEditing(true)}
                disabled={pending}
                aria-label="Editar"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                onClick={handleDelete}
                disabled={pending}
                aria-label="Excluir"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
