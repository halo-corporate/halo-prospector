import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listVerticais } from "@/lib/verticais/queries";
import { verticalLabel } from "@/lib/database.types";
import { TarefasSemanaWidget } from "./tarefas-semana-widget";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const [leadsRes, verticais] = await Promise.all([
    supabase.from("leads").select("vertical, status"),
    listVerticais(),
  ]);
  const leads = leadsRes.data ?? [];

  const byVertical = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const l of leads) {
    byVertical.set(l.vertical, (byVertical.get(l.vertical) ?? 0) + 1);
    byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
  }
  const total = leads.length;

  const verticaisLite = verticais.map((v) => ({
    slug: v.slug,
    label: v.label,
  }));

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

      <TarefasSemanaWidget />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Por vertical
        </h2>
        {verticais.length === 0 ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Nenhuma vertical cadastrada.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {verticais.map((v) => (
              <Link
                key={v.id}
                href={`/leads?vertical=${v.slug}`}
                className="rounded-lg border border-border p-4 hover:border-foreground/30 transition-colors"
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

      {/* Esta seção fica oculta porque uso o verticalLabel só pra type-check —
          mas o helper já é consumido em outras telas. */}
      {false ? <span>{verticalLabel("clinicas_medicas", verticaisLite)}</span> : null}
    </div>
  );
}
