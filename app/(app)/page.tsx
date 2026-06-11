import Link from "next/link";
import {
  AlertOctagon,
  CalendarCheck,
  CalendarClock,
  Flame,
  Instagram,
  PackageCheck,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  countFollowupBuckets,
  listOverdueFollowups,
  listTodayFollowups,
  listUpcomingFollowups,
} from "@/lib/leads/queries";
import { listRecentInteracoes } from "@/lib/interacoes/queries";
import { listVerticais } from "@/lib/verticais/queries";
import { countEnviosV3Buckets } from "@/lib/envios/queries";
import { countInfluencersV3Buckets } from "@/lib/influencers/queries";
import {
  INTERACAO_CANAL_LABELS,
  INTERACAO_TIPO_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  readLeadVerticais,
  verticalLabel,
  type Lead,
  type LeadStatus,
  type LeadTemperatura,
} from "@/lib/database.types";
import { statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, formatBRHuman } from "@/lib/timezone";
import { TarefasSemanaWidget } from "./tarefas-semana-widget";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  // Tudo em paralelo
  const [
    leadsRes,
    verticais,
    overdue,
    today,
    upcoming,
    buckets,
    recentInteracoes,
    enviosV3,
    influencersV3,
  ] = await Promise.all([
    supabase.from("leads").select("vertical, verticais, status, temperatura"),
    listVerticais(),
    listOverdueFollowups(8),
    listTodayFollowups(8),
    listUpcomingFollowups(7, 8),
    countFollowupBuckets(),
    listRecentInteracoes(5),
    countEnviosV3Buckets(),
    countInfluencersV3Buckets(),
  ]);

  const leads = leadsRes.data ?? [];
  const total = leads.length;
  const aquecidos = leads.filter((l) => l.status === "aquecido").length;

  // Por vertical: lead com N verticais conta em cada uma delas (option a).
  // Total da pagina (`total` acima) usa contagem distinta de leads.
  const byVertical = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byTemperatura = new Map<LeadTemperatura, number>();
  for (const l of leads) {
    const slugs = readLeadVerticais(l);
    for (const s of slugs) {
      byVertical.set(s, (byVertical.get(s) ?? 0) + 1);
    }
    byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
    if (l.temperatura) {
      byTemperatura.set(l.temperatura, (byTemperatura.get(l.temperatura) ?? 0) + 1);
    }
  }
  const temperaturaOrder: LeadTemperatura[] = ["frio", "morno", "quente"];

  const verticaisLite = verticais.map((v) => ({
    slug: v.slug,
    label: v.label,
  }));

  return (
    <div className="container py-8 relative overflow-x-clip">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="halo-eyebrow">Dashboard</p>
          <h1 className="title-display text-3xl sm:text-4xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "lead cadastrado" : "leads cadastrados"}
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/novo">+ Novo lead</Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total de leads"
          value={total}
          href="/crm"
        />
        <KpiCard
          icon={<AlertOctagon className="h-4 w-4" />}
          label="Follow-ups vencidos"
          value={buckets.overdue}
          tone={buckets.overdue > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Follow-ups hoje"
          value={buckets.today}
          tone={buckets.today > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          label="Leads aquecidos"
          value={aquecidos}
          href="/crm?status=aquecido"
          tone={aquecidos > 0 ? "primary" : "neutral"}
        />
      </div>

      {/* V3 — Envios & Influencers */}
      <section className="space-y-3">
        <h2 className="halo-eyebrow">Envios & Influencers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={<Truck className="h-4 w-4" />}
            label="A despachar"
            value={enviosV3.aDespachar}
            href="/envios?status=a_despachar"
            tone={enviosV3.aDespachar > 0 ? "warning" : "neutral"}
          />
          <KpiCard
            icon={<Truck className="h-4 w-4" />}
            label="Em trânsito"
            value={enviosV3.emTransito}
            href="/envios?status=em_transito"
            tone={enviosV3.emTransito > 0 ? "info" : "neutral"}
          />
          <KpiCard
            icon={<PackageCheck className="h-4 w-4" />}
            label="Entregues no mês"
            value={enviosV3.entreguesMes}
            href="/envios?status=entregue"
            tone={enviosV3.entreguesMes > 0 ? "primary" : "neutral"}
          />
          <KpiCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Parcerias ativas"
            value={influencersV3.parceriasAtivas}
            href="/influencers?status=parceria_ativa"
            tone={influencersV3.parceriasAtivas > 0 ? "primary" : "neutral"}
          />
          <KpiCard
            icon={<Instagram className="h-4 w-4" />}
            label="Posts publicados"
            value={influencersV3.postsPublicados}
            href="/influencers"
            tone={influencersV3.postsPublicados > 0 ? "primary" : "neutral"}
          />
        </div>
      </section>

      {/* Follow-ups + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <FollowupSection
            title="Vencidos"
            count={buckets.overdue}
            tone="danger"
            icon={<AlertOctagon className="h-4 w-4" />}
            leads={overdue}
            verticais={verticaisLite}
            emptyHint="Nenhum follow-up atrasado. Mantenha assim. 🎯"
          />
          <FollowupSection
            title="Hoje"
            count={buckets.today}
            tone="warning"
            icon={<CalendarClock className="h-4 w-4" />}
            leads={today}
            verticais={verticaisLite}
            emptyHint="Sem follow-ups agendados pra hoje."
          />
        </div>

        <div className="space-y-4">
          <TarefasSemanaWidget />
          <RecentActivitySection interacoes={recentInteracoes} />
        </div>
      </div>

      {/* Próximos 7 dias — coluna inteira */}
      <FollowupSection
        title="Próximos 7 dias"
        count={buckets.upcoming}
        tone="info"
        icon={<CalendarCheck className="h-4 w-4" />}
        leads={upcoming}
        verticais={verticaisLite}
        emptyHint="Nada agendado pros próximos 7 dias."
      />

      {/* Por vertical */}
      <section className="space-y-3">
        <h2 className="halo-eyebrow">Por vertical</h2>
        {verticais.length === 0 ? (
          <div className="halo-glass rounded-halo p-4 text-sm text-muted-foreground">
            Nenhuma vertical cadastrada.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {verticais.map((v) => (
              <Link
                key={v.id}
                href={`/crm?vertical=${v.slug}`}
                className="halo-glass rounded-halo p-4"
              >
                <p className="text-xs text-muted-foreground truncate">
                  {v.label}
                </p>
                <p className="text-2xl font-semibold mt-1">
                  {byVertical.get(v.slug) ?? 0}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Por temperatura — badges NEON com glow + pulse */}
      <section className="space-y-3">
        <h2 className="halo-eyebrow">Por temperatura</h2>
        <div className="halo-glass rounded-halo p-4 text-sm">
          {byTemperatura.size === 0 ? (
            <p className="text-muted-foreground">
              Nenhum lead com temperatura definida ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {temperaturaOrder.map((t) => {
                const count = byTemperatura.get(t) ?? 0;
                if (count === 0) return null;
                return (
                  <Link
                    key={t}
                    href={`/crm?temperatura=${t}`}
                    className="hover:opacity-80 inline-flex items-center gap-2"
                  >
                    <Badge
                      variant="outline"
                      className={temperaturaBadgeClass(t)}
                    >
                      {LEAD_TEMPERATURA_LABELS[t]}
                    </Badge>
                    <span className="font-medium">{count}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Por status */}
      <section className="space-y-3">
        <h2 className="halo-eyebrow">Por status</h2>
        <div className="halo-glass rounded-halo p-4 text-sm">
          {byStatus.size === 0 ? (
            <p className="text-muted-foreground">
              Sem leads ainda. Comece adicionando um em{" "}
              <Link href="/crm/novo" className="text-primary underline">
                + Novo lead
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Array.from(byStatus.entries()).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/crm?status=${status}`}
                  className="hover:opacity-80 inline-flex items-center gap-2"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      statusBadgeClass(status as LeadStatus),
                    )}
                  >
                    {LEAD_STATUS_LABELS[status as LeadStatus]}
                  </Badge>
                  <span className="font-medium">{count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponentes do Dashboard
// ────────────────────────────────────────────────────────────────────────────

type Tone = "neutral" | "primary" | "warning" | "danger" | "info";

function toneBorderClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return "border-red-500/30";
    // V2: "warning" (Hoje) usa o azul HALO em intensidade alta — ainda
    // distinguível de "info" (Próximos 7d) que usa o azul em opacidade menor.
    case "warning":
      return "border-primary/50";
    case "primary":
      return "border-primary/40";
    case "info":
      return "border-primary/20";
    case "neutral":
      return "border-white/10";
  }
}

function toneTextClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return "text-red-300";
    case "warning":
      return "text-primary";
    case "primary":
      return "text-primary";
    case "info":
      return "text-primary/70";
    case "neutral":
      return "text-muted-foreground";
  }
}

function KpiCard({
  icon,
  label,
  value,
  href,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  tone?: Tone;
}) {
  const content = (
    <div
      className={cn(
        "rounded-halo border bg-white/[0.04] backdrop-blur-[16px] p-4 space-y-1 transition-colors",
        toneBorderClass(tone),
        href && "hover:bg-accent",
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs", toneTextClass(tone))}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-display font-bold text-3xl sm:text-4xl tracking-[0.02em]">
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function FollowupSection({
  title,
  count,
  tone,
  icon,
  leads,
  verticais,
  emptyHint,
}: {
  title: string;
  count: number;
  tone: Tone;
  icon: React.ReactNode;
  leads: Lead[];
  verticais: { slug: string; label: string }[];
  emptyHint: string;
}) {
  return (
    <section
      className={cn(
        "rounded-halo border bg-white/[0.04] backdrop-blur-[16px] p-4 space-y-3",
        toneBorderClass(tone),
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2 text-sm font-medium", toneTextClass(tone))}>
          {icon}
          <span>{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">{emptyHint}</p>
      ) : (
        <ul className="space-y-1">
          {leads.map((l) => (
            <li key={l.id}>
              <Link
                href={`/crm/${l.id}`}
                className="flex items-center justify-between gap-3 px-2 py-1.5 -mx-2 rounded-md hover:bg-accent/40 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium truncate">
                    {l.empresa}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    ·{" "}
                    {readLeadVerticais(l)
                      .map((s) => verticalLabel(s, verticais))
                      .join(" · ") || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border text-[10px] py-0",
                      statusBadgeClass(l.status),
                    )}
                  >
                    {LEAD_STATUS_LABELS[l.status]}
                  </Badge>
                  {l.proximo_followup ? (
                    <span
                      className={cn(
                        "text-[11px] whitespace-nowrap",
                        toneTextClass(tone),
                      )}
                      title={formatBR(l.proximo_followup)}
                    >
                      {formatBR(l.proximo_followup, "dd/MM HH:mm")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentActivitySection({
  interacoes,
}: {
  interacoes: Awaited<ReturnType<typeof listRecentInteracoes>>;
}) {
  return (
    <section className="halo-glass rounded-halo p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide">Atividade recente</h2>
        <span className="text-xs text-muted-foreground">
          últimas {interacoes.length || 5}
        </span>
      </div>

      {interacoes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">
          Nenhuma interação registrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {interacoes.map((i) => (
            <li key={i.id}>
              <Link
                href={`/crm/${i.lead_id}`}
                className="block rounded-md px-2 py-1.5 -mx-2 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {i.lead_empresa}
                  </span>
                  <span
                    className="text-[10px] text-muted-foreground whitespace-nowrap"
                    title={formatBR(i.data_hora)}
                  >
                    {formatBRHuman(i.data_hora)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {INTERACAO_CANAL_LABELS[i.canal]} ·{" "}
                  {INTERACAO_TIPO_LABELS[i.tipo]}
                </p>
                <p className="text-xs text-foreground/80 truncate">{i.resumo}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
