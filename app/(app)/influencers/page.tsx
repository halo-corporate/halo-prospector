"use client";

import { useState, useTransition } from "react";
import { INFLUENCIADOR_STATUS_LABELS, type Influenciador } from "@/lib/database.types";
import { toast } from "sonner";

export default function InfluencersPage() {
  const [pending, startTransition] = useTransition();
  const [influencers, setInfluencers] = useState<Influenciador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchInfluencers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/influencers");
      if (!res.ok) throw new Error("Erro ao carregar influenciadores");
      const data = await res.json();
      setInfluencers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar influenciadores");
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
            <p className="halo-eyebrow">Influenciadores</p>
            <h1 className="title-display text-3xl sm:text-4xl">Influenciadores</h1>
          </div>
          <button
            onClick={fetchInfluencers}
            disabled={pending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            {pending ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : error ? (
          <div className="halo-glass rounded-halo p-4 text-destructive">
            {error}
          </div>
        ) : influencers.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum influenciador cadastrado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {influencers.map((inf) => (
              <div key={inf.id} className="halo-glass rounded-halo p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{inf.nome}</h3>
                    {inf.instagram && (
                      <p className="text-sm text-muted-foreground">
                        @{inf.instagram}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {INFLUENCIADOR_STATUS_LABELS[inf.status] || inf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
