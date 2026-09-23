"use client";

import { useState, useTransition } from "react";
import { type MensagemTemplate } from "@/lib/database.types";
import { toast } from "sonner";

export default function MensagensPage() {
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<MensagemTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTemplates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mensagens/templates");
      if (!res.ok) throw new Error("Erro ao carregar templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar templates");
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
            <p className="halo-eyebrow">Mensagens</p>
            <h1 className="title-display text-3xl sm:text-4xl">
              Mensagens Modelo
            </h1>
          </div>
          <button
            onClick={fetchTemplates}
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
        ) : templates.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum template de mensagem cadastrado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="halo-glass rounded-halo p-4">
                <h3 className="font-medium">{t.titulo}</h3>
                {t.etapa_funil && (
                  <p className="text-sm text-muted-foreground">{t.etapa_funil}</p>
                )}
                <p className="mt-2 text-sm line-clamp-3">{t.corpo}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
