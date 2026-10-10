"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type TarefaSemanal } from "@/lib/database.types";
import { useTransition } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaSemanal[];
  onRestore: () => void;
}

export function TarefasConcluidasDialog({
  open,
  onOpenChange,
  tarefas,
  onRestore,
}: Props) {
  const [pending, startTransition] = useTransition();

  async function handleRestore(id: string) {
    startTransition(async () => {
      const { default: actions } = await import("@/lib/checklist/actions");
      const result = await actions.toggleConcluida(id, false);
      if (result.success) {
        toast.success("Tarefa restaurada");
        onRestore();
      } else {
        toast.error(result.error || "Erro ao restaurar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tarefas concluídas ({tarefas.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tarefas.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma tarefa concluída
            </p>
          ) : (
            tarefas.map((tarefa) => (
              <div
                key={tarefa.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
              >
                <span className="text-sm line-through text-muted-foreground flex-1">
                  {tarefa.texto}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRestore(tarefa.id)}
                  disabled={pending}
                  title="Restaurar"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
