"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  type Lead,
  type Decisor,
  type Interacao,
  type Proposta,
  type Envio,
} from "@/lib/database.types";
import { statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, formatBRHuman } from "@/lib/timezone";
import { InteracoesTimeline } from "@/components/interacoes/interacoes-timeline";
import { DecisorCard } from "@/components/decisores/decisor-card";
import { AddDecisorForm } from "@/components/decisores/add-decisor-form";
import { AddInteracaoDialog } from "@/components/interacoes/add-interacao-dialog";
import { PropostaFormDialog } from "@/components/propostas/proposta-form-dialog";
import { PropostaCard } from "@/components/propostas/proposta-card";
import { EnvioFormDialog } from "@/components/envios/envio-form-dialog";
import { EnviosTable } from "@/components/envios/envios-table";
import {
  deleteLeadAction,
  updateLeadAction,
} from "@/lib/leads/actions";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lead, setLead] = useState<Lead | null>(null);
  const [decisores, setDecisores] = useState<Decisor[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDecisorForm, setShowDecisorForm] = useState(false);
  const [showInteracaoForm, setShowInteracaoForm] = useState(false);
  const [editingProposta, setEditingProposta] = useState<Proposta | null>(null);
  const [showEnvioForm, setShowEnvioForm] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      fetchLeadData(id);
    });
  }, [params]);

  async function fetchLeadData(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [leadRes, decisoresRes, interacoesRes, propostasRes, enviosRes] =
        await Promise.all([
          fetch(`/api/leads/${id}`),
          fetch(`/api/decisores?lead_id=${id}`),
          fetch(`/api/interacoes?lead_id=${id}`),
          fetch(`/api/propostas?lead_id=${id}`),
          fetch(`/api/envios?lead_id=${id}`),
        ]);
      if (!leadRes.ok) throw new Error("Lead não encontrado");
      const [
        leadData,
        decisoresData,
        interacoesData,
        propostasData,
        enviosData,
      ] = await Promise.all([
        leadRes.json(),
        decisoresRes.json(),
        interacoesRes.json(),
        propostasRes.json(),
        enviosRes.json(),
      ]);
      setLead(leadData);
      setDecisores(Array.isArray(decisoresData) ? decisoresData : []);
      setInteracoes(Array.isArray(interacoesData) ? interacoesData : []);
      setPropostas(Array.isArray(propostasData) ? propostasData : []);
      setEnvios(Array.isArray(enviosData) ? enviosData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar lead");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    if (!lead) return;
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    startTransition(async () => {
      try {
        await deleteLeadAction(lead.id);
        toast.success("Lead excluído");
        router.push("/crm");
      } catch {
        toast.error("Erro ao excluir lead");
      }
    });
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || "Lead não encontrado"}</p>
          <Button asChild variant="outline">
            <Link href="/crm">Voltar ao CRM</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{lead.empresa}</h1>
                <Badge
                  variant="outline"
                  className={statusBadgeClass(lead.status)}
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
              </div>
              {lead.emails?.[0] && (
                <p className="text-muted-foreground">{lead.emails[0]}</p>
              )}
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>

        {/* Informações */}
        <div className="halo-glass rounded-halo p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informações
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {lead.emails?.[0] && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.emails[0]}</span>
              </div>
            )}
            {lead.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.telefone}</span>
              </div>
            )}
            {lead.cidade && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{lead.cidade}</span>
              </div>
            )}
            {lead.proximo_followup && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Follow-up: {formatBRHuman(lead.proximo_followup)}</span>
              </div>
            )}
          </div>
          {lead.observacoes && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="mt-1">{lead.observacoes}</p>
            </div>
          )}
        </div>

        {/* Decisores */}
        <div className="halo-glass rounded-halo p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Decisores</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDecisorForm(true)}
            >
              + Adicionar
            </Button>
          </div>
          {decisores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum decisor cadastrado.
            </p>
          ) : (
            <div className="space-y-3">
              {decisores.map((d) => (
                <DecisorCard key={d.id} decisor={d} />
              ))}
            </div>
          )}
          {showDecisorForm && (
            <AddDecisorForm
              leadId={lead.id}
              onClose={() => {
                setShowDecisorForm(false);
                fetchLeadData(lead.id);
              }}
            />
          )}
        </div>

        {/* Interações */}
        <div className="halo-glass rounded-halo p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Interações</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInteracaoForm(true)}
            >
              + Registrar
            </Button>
          </div>
          {interacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma interação registrada.
            </p>
          ) : (
            <InteracoesTimeline interacoes={interacoes} leadId={lead.id} />
          )}
          <AddInteracaoDialog
            open={showInteracaoForm}
            onOpenChange={setShowInteracaoForm}
            leadId={lead.id}
            onSuccess={() => {
              setShowInteracaoForm(false);
              fetchLeadData(lead.id);
            }}
          />
        </div>

        {/* Propostas */}
        <div className="halo-glass rounded-halo p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Propostas</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProposta({} as Proposta)}
            >
              + Nova Proposta
            </Button>
          </div>
          {propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma proposta criada.
            </p>
          ) : (
            <div className="space-y-3">
              {propostas.map((p) => (
                <PropostaCard
                  key={p.id}
                  proposta={p}
                  onEdit={() => setEditingProposta(p)}
                />
              ))}
            </div>
          )}
          <PropostaFormDialog
            open={!!editingProposta}
            onOpenChange={(open) => !open && setEditingProposta(null)}
            proposta={editingProposta || undefined}
            leadId={lead.id}
            onSuccess={() => {
              setEditingProposta(null);
              fetchLeadData(lead.id);
            }}
          />
        </div>

        {/* Envios */}
        <div className="halo-glass rounded-halo p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Envios</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnvioForm(true)}
            >
              + Novo Envio
            </Button>
          </div>
          {envios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum envio registrado.
            </p>
          ) : (
            <EnviosTable envios={envios} />
          )}
          <EnvioFormDialog
            open={showEnvioForm}
            onOpenChange={setShowEnvioForm}
            leadId={lead.id}
            onSuccess={() => {
              setShowEnvioForm(false);
              fetchLeadData(lead.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
