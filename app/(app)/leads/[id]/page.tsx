import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLeadById } from "@/lib/leads/queries";
import { listVerticais } from "@/lib/verticais/queries";
import { listDecisoresByLead } from "@/lib/decisores/queries";
import { listInteracoesByLead } from "@/lib/interacoes/queries";
import { LEAD_STATUS_LABELS, verticalLabel } from "@/lib/database.types";
import { statusBadgeClass } from "@/lib/leads/badge";
import { formatBR } from "@/lib/timezone";
import { LeadForm } from "../lead-form";
import { DeleteLeadButton } from "./delete-lead-button";
import { DecisorCard } from "@/components/decisores/decisor-card";
import { AddDecisorForm } from "@/components/decisores/add-decisor-form";
import { AddInteracaoDialog } from "@/components/interacoes/add-interacao-dialog";
import { InteracoesTimeline } from "@/components/interacoes/interacoes-timeline";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [lead, verticais] = await Promise.all([
    getLeadById(params.id),
    listVerticais(),
  ]);
  if (!lead) notFound();

  const [decisores, interacoes] = await Promise.all([
    listDecisoresByLead(lead.id),
    listInteracoesByLead(lead.id),
  ]);

  const verticaisLite = verticais.map((v) => ({
    slug: v.slug,
    label: v.label,
  }));

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Voltar para lista
          </Link>
          <h1 className="title-display text-2xl truncate">
            {lead.empresa}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className={cn("border", statusBadgeClass(lead.status))}
            >
              {LEAD_STATUS_LABELS[lead.status]}
            </Badge>
            <span>·</span>
            <span>{verticalLabel(lead.vertical, verticaisLite)}</span>
            <span>·</span>
            <span>
              {[lead.cidade, lead.estado].filter(Boolean).join("/") || "sem local"}
            </span>
            <span>·</span>
            <span>atualizado em {formatBR(lead.updated_at)}</span>
          </div>
        </div>
        <DeleteLeadButton id={lead.id} empresa={lead.empresa} />
      </div>

      {/* 2 colunas no desktop, empilhado no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Coluna esquerda: dados do lead */}
        <div className="rounded-lg border border-border p-4 sm:p-6">
          <LeadForm mode="edit" lead={lead} verticais={verticaisLite} />
        </div>

        {/* Coluna direita: decisores + interações */}
        <div className="space-y-6">
          {/* Decisores */}
          <section className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-wide">
                Decisores
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({decisores.length})
                </span>
              </h2>
            </div>

            {decisores.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                Nenhum decisor cadastrado. Comece pelo D1 (primário).
              </p>
            ) : (
              <div className="space-y-2">
                {decisores.map((d) => (
                  <DecisorCard key={d.id} decisor={d} />
                ))}
              </div>
            )}

            <AddDecisorForm leadId={lead.id} />
          </section>

          {/* Interações */}
          <section className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium tracking-wide">
                Timeline
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({interacoes.length})
                </span>
              </h2>
              <AddInteracaoDialog
                leadId={lead.id}
                decisores={decisores.map((d) => ({
                  id: d.id,
                  nome: d.nome,
                  prioridade: d.prioridade,
                }))}
              />
            </div>

            <InteracoesTimeline interacoes={interacoes} leadId={lead.id} />
          </section>
        </div>
      </div>
    </div>
  );
}
