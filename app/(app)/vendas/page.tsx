"use client";

import { useState, useTransition } from "react";
import { VENDA_STATUS_LABELS, type Venda } from "@/lib/database.types";
import { toast } from "sonner";

export default function VendasPage() {
  const [pending, startTransition] = useTransition();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchVendas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendas");
      if (!res.ok) throw new Error("Erro ao carregar vendas");
      const data = await res.json();
      setVendas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar vendas");
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
            <p className="halo-eyebrow">Vendas</p>
            <h1 className="title-display text-3xl sm:text-4xl">Vendas</h1>
          </div>
          <button
            onClick={fetchVendas}
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
        ) : vendas.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Nenhuma venda registrada.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => (
              <div key={v.id} className="halo-glass rounded-halo p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {v.descricao || "Venda"}
                    </h3>
                    {v.cliente_nome && (
                      <p className="text-sm text-muted-foreground">
                        {v.cliente_nome}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {v.valor_liquido
                        ? `R$ ${v.valor_liquido.toLocaleString("pt-BR")}`
                        : "—"}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {VENDA_STATUS_LABELS[v.status] || v.status}
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
