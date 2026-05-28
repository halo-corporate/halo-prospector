import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLeadById } from "@/lib/leads/queries";
import { listVerticais } from "@/lib/verticais/queries";
import {
  LEAD_STATUS_LABELS,
  verticalLabel,
} from "@/lib/database.types";
import { statusBadgeClass } from "@/lib/leads/badge";
import { formatBR } from "@/lib/timezone";
import { LeadForm } from "../lead-form";
import { DeleteLeadButton } from "./delete-lead-button";

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

  const verticaisLite = verticais.map((v) => ({
    slug: v.slug,
    label: v.label,
  }));

  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Voltar para lista
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight truncate">
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

      <div className="rounded-lg border border-border p-4 sm:p-6">
        <LeadForm mode="edit" lead={lead} verticais={verticaisLite} />
      </div>

      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Decisores e timeline de interações chegam na próxima etapa.
      </div>
    </div>
  );
}
