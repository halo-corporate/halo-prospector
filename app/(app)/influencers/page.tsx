"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, X, Users, Edit2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  INFLUENCER_STATUS_LABELS,
  INFLUENCER_CONTRATO_TIPO_LABELS,
  type Influencer,
  type InfluencerStatus,
  type InfluencerContratoTipo,
} from "@/lib/database.types";
import { formatBR } from "@/lib/timezone";
import { toast } from "sonner";

const STATUS_OPTIONS: InfluencerStatus[] = [
  "prospeccao",
  "contatado",
  "negociando",
  "kit_enviado",
  "postou",
  "parceria_ativa",
  "encerrado",
];

const CONTRATO_TIPOS: InfluencerContratoTipo[] = ["permuta", "pago", "permuta_e_pago"];

const STATUS_COLORS: Record<InfluencerStatus, string> = {
  prospeccao: "border-blue-500/50 text-blue-400",
  contatado: "border-purple-500/50 text-purple-400",
  negociando: "border-yellow-500/50 text-yellow-400",
  kit_enviado: "border-orange-500/50 text-orange-400",
  postou: "border-green-500/50 text-green-400",
  parceria_ativa: "border-emerald-500/50 text-emerald-400",
  encerrado: "border-muted text-muted-foreground",
};

interface InfluencerFormData {
  nome: string;
  handle_instagram: string;
  handle_tiktok: string;
  handle_youtube: string;
  seguidores_instagram: string;
  seguidores_tiktok: string;
  seguidores_youtube: string;
  engajamento_pct: string;
  nicho: string;
  cidade: string;
  uf: string;
  status: InfluencerStatus;
  contrato_tipo: InfluencerContratoTipo | "";
  valor_cache: string;
  codigo_promocional: string;
  observacoes: string;
}

const EMPTY_FORM: InfluencerFormData = {
  nome: "",
  handle_instagram: "",
  handle_tiktok: "",
  handle_youtube: "",
  seguidores_instagram: "",
  seguidores_tiktok: "",
  seguidores_youtube: "",
  engajamento_pct: "",
  nicho: "",
  cidade: "",
  uf: "",
  status: "prospeccao",
  contrato_tipo: "",
  valor_cache: "",
  codigo_promocional: "",
  observacoes: "",
};

function InfluencerForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Influencer;
  onSubmit: (data: InfluencerFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<InfluencerFormData>(
    initial
      ? {
          nome: initial.nome,
          handle_instagram: initial.handle_instagram ?? "",
          handle_tiktok: initial.handle_tiktok ?? "",
          handle_youtube: initial.handle_youtube ?? "",
          seguidores_instagram: initial.seguidores_instagram?.toString() ?? "",
          seguidores_tiktok: initial.seguidores_tiktok?.toString() ?? "",
          seguidores_youtube: initial.seguidores_youtube?.toString() ?? "",
          engajamento_pct: initial.engajamento_pct?.toString() ?? "",
          nicho: initial.nicho ?? "",
          cidade: initial.cidade ?? "",
          uf: initial.uf ?? "",
          status: initial.status,
          contrato_tipo: initial.contrato_tipo ?? "",
          valor_cache: initial.valor_cache?.toString() ?? "",
          codigo_promocional: initial.codigo_promocional ?? "",
          observacoes: initial.observacoes ?? "",
        }
      : EMPTY_FORM,
  );

  function set(key: keyof InfluencerFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
          <Input
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            placeholder="Nome completo ou @handle"
            required
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nicho</label>
          <Input
            value={form.nicho}
            onChange={(e) => set("nicho", e.target.value)}
            placeholder="Ex: fitness, moda, pets"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Instagram</label>
          <Input
            value={form.handle_instagram}
            onChange={(e) => set("handle_instagram", e.target.value)}
            placeholder="@usuario"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">TikTok</label>
          <Input
            value={form.handle_tiktok}
            onChange={(e) => set("handle_tiktok", e.target.value)}
            placeholder="@usuario"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">YouTube</label>
          <Input
            value={form.handle_youtube}
            onChange={(e) => set("handle_youtube", e.target.value)}
            placeholder="@canal"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Seguidores Instagram</label>
          <Input
            type="number"
            value={form.seguidores_instagram}
            onChange={(e) => set("seguidores_instagram", e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Seguidores TikTok</label>
          <Input
            type="number"
            value={form.seguidores_tiktok}
            onChange={(e) => set("seguidores_tiktok", e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Seguidores YouTube</label>
          <Input
            type="number"
            value={form.seguidores_youtube}
            onChange={(e) => set("seguidores_youtube", e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Engajamento (%)</label>
          <Input
            type="number"
            step="0.1"
            value={form.engajamento_pct}
            onChange={(e) => set("engajamento_pct", e.target.value)}
            placeholder="0.0"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Cidade</label>
          <Input
            value={form.cidade}
            onChange={(e) => set("cidade", e.target.value)}
            placeholder="Cidade"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">UF</label>
          <Input
            value={form.uf}
            onChange={(e) => set("uf", e.target.value.toUpperCase())}
            placeholder="SP"
            maxLength={2}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as InfluencerStatus)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{INFLUENCER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Tipo de contrato</label>
          <select
            value={form.contrato_tipo}
            onChange={(e) => set("contrato_tipo", e.target.value as InfluencerContratoTipo | "")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecione</option>
            {CONTRATO_TIPOS.map((t) => (
              <option key={t} value={t}>{INFLUENCER_CONTRATO_TIPO_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Valor cachê (R$)</label>
          <Input
            type="number"
            step="0.01"
            value={form.valor_cache}
            onChange={(e) => set("valor_cache", e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Código promocional</label>
          <Input
            value={form.codigo_promocional}
            onChange={(e) => set("codigo_promocional", e.target.value)}
            placeholder="HALO10"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Anotações sobre o influenciador..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.nome.trim()}
        >
          {loading ? "Salvando..." : initial ? "Salvar" : "Criar influenciador"}
        </Button>
      </div>
    </div>
  );
}

export default function InfluencersPage() {
  const [pending, startTransition] = useTransition();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InfluencerStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchInfluencers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/influencers");
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setInfluencers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      toast.error("Erro ao carregar influenciadores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInfluencers();
  }, []);

  async function handleSubmit(data: InfluencerFormData) {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== "") formData.append(key, value);
      });

      const url = editing
        ? `/api/influencers/${editing.id}`
        : "/api/influencers";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }

      toast.success(editing ? "Influenciador atualizado!" : "Influenciador criado!");
      setShowForm(false);
      setEditing(null);
      fetchInfluencers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este influenciador?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/influencers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Influenciador excluído!");
      fetchInfluencers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = influencers.filter((inf) => {
    const matchSearch =
      !search ||
      inf.nome.toLowerCase().includes(search.toLowerCase()) ||
      inf.handle_instagram?.toLowerCase().includes(search.toLowerCase()) ||
      inf.nicho?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || inf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function fmtNum(n: number | null | undefined) {
    if (n == null) return "—";
    return n.toLocaleString("pt-BR");
  }

  function fmtPct(n: number | null | undefined) {
    if (n == null) return "—";
    return `${n.toLocaleString("pt-BR")}%`;
  }

  function fmtMoney(n: number | null | undefined) {
    if (n == null) return "—";
    return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="halo-eyebrow">Influenciadores</p>
            <h1 className="title-display text-3xl sm:text-4xl">Influenciadores</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${filtered.length} de ${influencers.length} influenciadores`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchInfluencers} disabled={pending}>
              Atualizar
            </Button>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Novo influencer
            </Button>
          </div>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="halo-glass rounded-halo p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Editar influenciador" : "Novo influenciador"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <InfluencerForm
              initial={editing ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditing(null); }}
              loading={saving}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="halo-glass rounded-halo p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, @ ou nicho..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InfluencerStatus | "")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{INFLUENCER_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {(search || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setStatusFilter(""); }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : error ? (
          <div className="halo-glass rounded-halo p-4 text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="halo-glass rounded-halo p-8 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {influencers.length === 0
                ? "Nenhum influenciador cadastrado."
                : "Nenhum influenciador encontrado com esses filtros."}
            </p>
            {influencers.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro influenciador
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inf) => (
              <div
                key={inf.id}
                className="halo-glass rounded-halo p-4 hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-base">{inf.nome}</h3>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[inf.status]}
                      >
                        {INFLUENCER_STATUS_LABELS[inf.status]}
                      </Badge>
                      {inf.contrato_tipo && (
                        <Badge variant="outline" className="border-white/20 text-muted-foreground">
                          {INFLUENCER_CONTRATO_TIPO_LABELS[inf.contrato_tipo]}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {inf.handle_instagram && (
                        <span>📷 @{inf.handle_instagram}</span>
                      )}
                      {inf.handle_tiktok && (
                        <span>🎵 @{inf.handle_tiktok}</span>
                      )}
                      {inf.handle_youtube && (
                        <span>▶️ @{inf.handle_youtube}</span>
                      )}
                      {inf.nicho && <span>{inf.nicho}</span>}
                      {inf.cidade && <span>{inf.cidade}{inf.uf ? `, ${inf.uf}` : ""}</span>}
                    </div>

                    <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground flex-wrap">
                      <span title="Seguidores Instagram">
                        📷 {fmtNum(inf.seguidores_instagram)}
                      </span>
                      <span title="Seguidores TikTok">
                        🎵 {fmtNum(inf.seguidores_tiktok)}
                      </span>
                      <span title="Seguidores YouTube">
                        ▶️ {fmtNum(inf.seguidores_youtube)}
                      </span>
                      <span title="Alcance total">
                        🌐 {fmtNum(inf.alcance_total)}
                      </span>
                      <span title="Engajamento">
                        💬 {fmtPct(inf.engajamento_pct)}
                      </span>
                      {inf.valor_cache != null && (
                        <span title="Cachê" className="text-green-400">
                          💰 {fmtMoney(inf.valor_cache)}
                        </span>
                      )}
                      {inf.codigo_promocional && (
                        <span title="Código promocional" className="text-blue-400">
                          🏷️ {inf.codigo_promocional}
                        </span>
                      )}
                    </div>

                    {inf.observacoes && (
                      <p className="mt-2 text-sm text-muted-foreground/70 italic line-clamp-2">
                        {inf.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditing(inf); setShowForm(true); }}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(inf.id)}
                      disabled={deletingId === inf.id}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
