"use client";

import { useState, useTransition } from "react";
import { ENVIO_STATUS_LABELS, type Envio } from "@/lib/database.types";
import { toast } from "sonner";

export default function EnviosPage() {
  const [pending, startTransition] = useTransition();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchEnvios() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/envios");
      if (!res.ok) throw new Error("Erro ao carregar envios");
      const data = await res.json();
      setEnvios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar envios");
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
            <p className="halo-eyebrow">Envios</p>
            <h1 className="title-display text-3xl sm:text-4xl">Envios</h1>
          </div>
          <button
            onClick={fetchEnvios}
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
        ) : envios.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum envio cadastrado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {envios.map((e) => (
              <div key={e.id} className="halo-glass rounded-halo p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {e.destinatario_nome || "Sem nome"}
                    </h3>
                    {e.destinatario_endereco && (
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {e.destinatario_endereco}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ENVIO_STATUS_LABELS[e.status] || e.status}
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
