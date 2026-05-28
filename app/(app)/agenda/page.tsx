import Link from "next/link";
import {
  AlertOctagon,
  CalendarCheck,
  CalendarClock,
  CalendarX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listOverdueFollowups,
  listTodayFollowups,
  listUpcomingFollowups,
} from "@/lib/leads/queries";
import { listVerticais } from "@/lib/verticais/queries";
import {
  LEAD_STATUS_LABELS,
  verticalLabel,
  type Lead,
} from "@/lib/database.types";
import { statusBadgeClass } from "@/lib/leads/badge";
import { formatBR, isOverdueBR } from "@/lib/timezone";

export const metadata = { title: "Agenda — HALO Prospector" };
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [overdue, today, upcoming, verticais] = await Promise.all([
    listOverdueFollowups(),
    listTodayFollowups(),
    listUpcomingFollowups(7),
    listVerticais(),
  ]);

  const verticaisLite = verticais.map((v) => ({
    slug: v.slug,
    label: v.label,
  }));

  const totalAgenda = overdue.length + today.length + upcoming.length;

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="title-display text-2xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {totalAgenda === 0
              ? "Sem follow-ups agendados. Adicione um a um lead pra ele aparecer aqui."
              : `${totalAgenda} ${totalAgenda === 1 ? "follow-up" : "follow-ups"} no radar`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/leads">Ir pra Leads</Link>
        </Button>
      </div>

      <Bucket
        title="Vencidos"
        icon={<AlertOctagon className="h-4 w-4" />}
        tone="danger"
        count={overdue.length}
        leads={overdue}
        verticais={verticaisLite}
        emptyHint="Nenhum follow-up atrasado. 🎯"
      />

      <Bucket
        title="Hoje"
        icon={<CalendarClock className="h-4 w-4" />}
        tone="warning"
        count={today.length}
        leads={today}
        verticais={verticaisLite}
        emptyHint="Sem follow-ups agendados pra hoje."
      />

      <Bucket
        title="Próximos 7 dias"
        icon={<CalendarCheck className="h-4 w-4" />}
        tone="info"
        count={upcoming.length}
        leads={upcoming}
        verticais={verticaisLite}
        emptyHint="Nada agendado pros próximos 7 dias."
      />

      {totalAgenda === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 p-10 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-accent flex items-center justify-center">
            <CalendarX className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sua agenda está vazia. Para um lead aparecer aqui, abre o detalhe
            dele e preenche o campo <strong className="text-foreground">Próximo follow-up</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

type Tone = "danger" | "warning" | "info";

function toneBorderClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return "border-red-500/30";
    case "warning":
      return "border-primary/50";
    case "info":
      return "border-primary/20";
  }
}
function toneTextClass(tone: Tone): string {
  switch (tone) {
    case "danger":
      return "text-red-300";
    case "warning":
      return "text-primary";
    case "info":
      return "text-primary/70";
  }
}

function Bucket({
  title,
  icon,
  tone,
  count,
  leads,
  verticais,
  emptyHint,
}: {
  title: string;
  icon: React.ReactNode;
  tone: Tone;
  count: number;
  leads: Lead[];
  verticais: { slug: string; label: string }[];
  emptyHint: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border bg-card/40 p-4 space-y-3",
        toneBorderClass(tone),
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          toneTextClass(tone),
        )}
      >
        {icon}
        <span>{title}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>

      {leads.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-border/60 -mx-2">
          {leads.map((l) => {
            const isVencido = !!l.proximo_followup && isOverdueBR(l.proximo_followup);
            return (
              <li key={l.id}>
                <Link
                  href={`/leads/${l.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-accent/40 rounded-md transition-colors"
                >
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {l.empresa}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border text-[10px] py-0",
                          statusBadgeClass(l.status),
                        )}
                      >
                        {LEAD_STATUS_LABELS[l.status]}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {verticalLabel(l.vertical, verticais)}
                      {l.cidade || l.estado
                        ? ` · ${[l.cidade, l.estado].filter(Boolean).join("/")}`
                        : ""}
                      {l.proximo_passo ? ` · ${l.proximo_passo}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        isVencido ? "text-red-300" : toneTextClass(tone),
                      )}
                      title={formatBR(l.proximo_followup!)}
                    >
                      {formatBR(l.proximo_followup!, "dd/MM HH:mm")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
