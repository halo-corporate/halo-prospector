"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChecklistItem } from "@/components/checklist/checklist-item";
import { AddTarefaInput } from "@/components/checklist/add-tarefa-input";
import { CopyPendingButton } from "./copy-pending-button";
import { TarefasConcluidasDialog } from "./tarefas-concluidas-dialog";
import { type CategoriaTarefa, type TarefaSemanal } from "@/lib/database.types";
import { toast } from "sonner";

export default function ChecklistPage() {
  const [pending, startTransition] = useTransition();
  const [tarefas, setTarefas] = useState<TarefaSemanal[]>([]);
  const [categorias, setCategorias] = useState<CategoriaTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concluidasOpen, setConcluidasOpen] = useState(false);

  async function fetchTarefas() {
    setLoading(true);
    setError(null);
    try {
      const [tarefasRes, catsRes] = await Promise.all([
        fetch("/api/tarefas"),
        fetch("/api/categorias"),
      ]);
      if (!tarefasRes.ok || !catsRes.ok) {
        throw new Error("Erro ao carregar dados");
      }
      const [tarefasData, catsData] = await Promise.all([
        tarefasRes.json(),
        catsRes.json(),
      ]);
      setTarefas(tarefasData);
      setCategorias(catsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar checklist");
    } finally {
      setLoading(false);
    }
  }

  // Carrega ao montar
  useState(() => {
    fetchTarefas();
  });

  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);

  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="halo-eyebrow">Checklist</p>
            <h1 className="title-display text-3xl sm:text-4xl">
              Tarefas da Semana
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Carregando..."
                : `${pendentes.length} pendentes · ${concluidas.length} concluídas`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConcluidasOpen(true)}
              disabled={concluidas.length === 0}
            >
              Concluídas ({concluidas.length})
            </Button>
            <CopyPendingButton tarefas={pendentes} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : error ? (
          <div className="halo-glass rounded-halo p-4 text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <AddTarefaInput onAdd={fetchTarefas} />
            <div className="space-y-3">
              {pendentes.map((tarefa) => (
                <ChecklistItem
                  key={tarefa.id}
                  tarefa={tarefa}
                  categorias={categorias}
                />
              ))}
            </div>
            {pendentes.length === 0 && (
              <div className="halo-glass rounded-halo p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhuma tarefa pendente. 🎉
                </p>
              </div>
            )}
          </div>
        )}

        <TarefasConcluidasDialog
          open={concluidasOpen}
          onOpenChange={setConcluidasOpen}
          tarefas={concluidas}
          onRestore={fetchTarefas}
        />
      </div>
    </div>
  );
}
