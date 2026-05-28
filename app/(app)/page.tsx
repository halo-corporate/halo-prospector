import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LEAD_VERTICAL_LABELS, type LeadVertical } from "@/lib/database.types";

/**
 * Dashboard — V1 enxuto: contagens por vertical e por status.
 * Será expandido na Etapa 6 (follow-ups vencidos, hoje, últimas interações).
 */
export default async function DashboardPage() {
  const supabase = createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("vertical, status");

  const byVertical = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const l of leads ?? []) {
    byVertical.set(l.vertical, (byVertical.get(l.vertical) ?? 0) + 1);
    byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
  }
  const total = leads?.length ?? 0;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "lead cadastrado" : "leads cadastrados"}
          </p>
        </div>
        <Button asChild>
          <Link href="/leads/novo">+ Novo lead</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Por vertical
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(LEAD_VERTICAL_LABELS) as LeadVertical[]).map((v) => (
            <Link
              key={v}
              href={`/leads?vertical=${v}`}
              className="rounded-lg border border-border p-4 hover:border-foreground/30 transition-colors"
            >
              <p className="text-xs text-muted-foreground">
                {LEAD_VERTICAL_LABELS[v]}
              </p>
              <p className="text-2xl font-semibold mt-1">
                {byVertical.get(v) ?? 0}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Por status
        </h2>
        <div className="rounded-lg border border-border p-4 text-sm">
          {byStatus.size === 0 ? (
            <p className="text-muted-foreground">
              Sem leads ainda. Comece adicionando um em{" "}
              <Link href="/leads/novo" className="text-primary underline">
                + Novo lead
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Array.from(byStatus.entries()).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/leads?status=${status}`}
                  className="hover:opacity-80"
                >
                  <span className="text-muted-foreground">{status}: </span>
                  <span className="font-medium">{count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Status do projeto</p>
        <p>✓ Etapas 1-3 (setup, schema, auth) — em produção</p>
        <p>✓ Etapa 4 — CRUD de Leads</p>
        <p className="text-muted-foreground/70 pt-1">
          Próxima: Decisores e Interações no detalhe do lead.
        </p>
      </section>
    </div>
  );
}
