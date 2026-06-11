"use client";

import { useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatWeekLabelBR } from "@/lib/timezone";
import type { SemanaResumo } from "@/lib/tarefas/queries";

interface Props {
  semanas: SemanaResumo[];
}

export function WeeksHistoryDialog({ semanas }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="h-3.5 w-3.5" />
          Semanas anteriores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Semanas anteriores</DialogTitle>
          <DialogDescription>
            Clique numa semana pra abrir o checklist dela.
          </DialogDescription>
        </DialogHeader>

        {semanas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sem semanas anteriores registradas.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {semanas.map((s) => {
              const pct =
                s.total === 0 ? 0 : Math.round((s.concluidas / s.total) * 100);
              return (
                <li key={s.semana}>
                  <Link
                    href={`/checklist?semana=${s.semana}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium truncate">
                        {formatWeekLabelBR(s.semana)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.concluidas} de {s.total}{" "}
                        {s.total === 1 ? "tarefa" : "tarefas"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-xs text-muted-foreground">
                        {pct}%
                      </span>
                      <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
