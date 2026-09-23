"use client";

import { useState, useTransition } from "react";
import { type Link } from "@/lib/database.types";
import { toast } from "sonner";

export default function LinksPage() {
  const [pending, startTransition] = useTransition();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLinks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/links");
      if (!res.ok) throw new Error("Erro ao carregar links");
      const data = await res.json();
      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar links");
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
            <p className="halo-eyebrow">Links</p>
            <h1 className="title-display text-3xl sm:text-4xl">
              Central de Links
            </h1>
          </div>
          <button
            onClick={fetchLinks}
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
        ) : links.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhum link cadastrado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="halo-glass rounded-halo p-4 hover:bg-white/[0.08] transition-colors"
              >
                <h3 className="font-medium truncate">{link.titulo}</h3>
                {link.tipo && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {link.tipo}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
