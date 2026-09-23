"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROPOSTA_STATUS_LABELS, type Proposta } from "@/lib/database.types";
import { statusBadgeClass } from "@/lib/propostas/badge";
import { formatBR } from "@/lib/timezone";
import { toast } from "sonner";

export default function PropostasPage() {
  const [pending, startTransition] = useTransition();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPropostas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/propostas");
      if (!res.ok) throw new Error("Erro ao carregar propostas");
      const data = await res.json();
      setPropostas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="halo-eyebrow">Propostas</p>
            <h1 className="title-display text-3xl sm:text-4xl">Propostas</h1>
          </div>
          <Button onClick={fetchPropostas} disabled={pending}>
            {pending ? "Carregando..." : "Atualizar"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : error ? (
          <div className="halo-glass rounded-halo p-4 text-destructive">
            {error}
          </div>
        ) : propostas.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhuma proposta criada ainda.
            </p>
            <p className="text-sm text-muted-foreground">
              Propostas são criadas a partir de um lead no CRM.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {propostas.map((p) => (
              <div
                key={p.id}
                className="halo-glass rounded-halo p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{p.titulo || "Sem título"}</h3>
                    {p.cliente && (
                      <p className="text-sm text-muted-foreground">
                        {p.cliente}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {p.created_at ? formatBR(p.created_at) : ""}
                    </span>
                    <span className={statusBadgeClass(p.status)}>
                      {PROPOSTA_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
