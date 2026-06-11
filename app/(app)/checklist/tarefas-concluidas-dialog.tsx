"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBR, formatWeekLabelBR } from "@/lib/timezone";
import type { TarefaSemanal } from "@/lib/database.types";

interface Props {
  tarefas: TarefaSemanal[];
}

export function TarefasConcluidasDialog({ tarefas }: Props) {
  const [open, setOpen] = useState(false);

  const gruposPorSemana = useMemo(() => {
    const map = new Map<string, TarefaSemanal[]>();
    for (const t of tarefas) {
      const arr = map.get(t.semana) ?? [];
      arr.push(t);
      map.set(t.semana, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [tarefas]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="h-3.5 w-3.5" />
          Tarefas concluídas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tarefas concluídas</DialogTitle>
          <DialogDescription>
            Tudo que você já marcou como feito, agrupado por semana.
          </DialogDescription>
        </DialogHeader>

        {tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma tarefa concluída ainda. Bora marcar a primeira.
          </p>
        ) : (
          <div className="space-y-4">
            {gruposPorSemana.map(([semana, itens]) => (
              <div key={semana} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatWeekLabelBR(semana)}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {itens.length}{" "}
                    {itens.length === 1 ? "tarefa" : "tarefas"}
                  </p>
                </div>
                <ul className="space-y-1">
                  {itens.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2 rounded-md border border-white/10 px-3 py-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm truncate">{t.texto}</p>
                        {t.concluida_em ? (
                          <p className="text-[11px] text-muted-foreground">
                            {formatBR(t.concluida_em)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
