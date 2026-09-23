"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  type Lead,
  type LeadStatus,
  type LeadTemperatura,
} from "@/lib/database.types";
import { statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, formatBRHuman } from "@/lib/timezone";
import { toast } from "sonner";

const STATUS_OPTIONS: LeadStatus[] = [
  "novo",
  "contato_inicial",
  "reuniao_agendada",
  "proposta_enviada",
  "negociacao",
  "aquecido",
  "convertido",
  "perdido",
  "inativo",
];
const TEMP_OPTIONS: LeadTemperatura[] = ["frio", "morno", "quente"];

export default function CrmPage() {
  const [pending, startTransition] = useTransition();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    status: "" as LeadStatus | "",
    temperatura: "" as LeadTemperatura | "",
  });

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.status) params.set("status", filters.status);
      if (filters.temperatura) params.set("temperatura", filters.temperatura);
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar leads");
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }

  // Carrega ao montar e quando filtros mudam
  useState(() => {
    fetchLeads();
  });

  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="halo-eyebrow">CRM</p>
            <h1 className="title-display text-3xl sm:text-4xl">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${leads.length} ${leads.length === 1 ? "lead encontrado" : "leads encontrados"}`}
            </p>
          </div>
          <Button asChild>
            <Link href="/crm/novo">+ Novo lead</Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="halo-glass rounded-halo p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa..."
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="pl-9"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as LeadStatus | "" })
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filters.temperatura}
              onChange={(e) =>
                setFilters({ ...filters, temperatura: e.target.value as LeadTemperatura | "" })
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas temperaturas</option>
              {TEMP_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {LEAD_TEMPERATURA_LABELS[t]}
                </option>
              ))}
            </select>
            {(filters.q || filters.status || filters.temperatura) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ q: "", status: "", temperatura: "" })}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button onClick={fetchLeads} disabled={pending}>
              {pending ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        {/* Lista de Leads */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <p className="text-muted-foreground">Nenhum lead encontrado.</p>
            <Button asChild variant="outline">
              <Link href="/crm/novo">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro lead
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/crm/${lead.id}`}
                className="halo-glass rounded-halo p-4 block hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{lead.empresa}</h3>
                    {lead.contato && (
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.contato}
                        {lead.cargo ? ` · ${lead.cargo}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn("border", statusBadgeClass(lead.status))}
                    >
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                    {lead.temperatura && (
                      <Badge
                        variant="outline"
                        className={temperaturaBadgeClass(lead.temperatura)}
                      >
                        {LEAD_TEMPERATURA_LABELS[lead.temperatura]}
                      </Badge>
                    )}
                    {lead.proximo_followup && (
                      <span className="text-xs text-muted-foreground">
                        {formatBRHuman(lead.proximo_followup)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
