import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Agenda — HALO Prospector" };

/**
 * Placeholder — a rota existe (não dá 404) mas a tela completa só vem na
 * Etapa 7. Quando você abrir, vê o estado real do roadmap em vez de erro.
 */
export default function AgendaPlaceholderPage() {
  return (
    <div className="container py-12 max-w-2xl">
      <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-5">
        <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center">
          <CalendarClock className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Agenda — em breve
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Esta tela é da <strong>Etapa 7</strong>. Vai listar follow-ups
            vencidos, hoje e nos próximos 7 dias, todos em fuso BR.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar pro Dashboard</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/leads">Ver Leads</Link>
          </Button>
        </div>

        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
          Roadmap V1 · 9 etapas
        </p>
      </div>
    </div>
  );
}
