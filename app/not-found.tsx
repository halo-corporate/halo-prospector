import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404 global — substitui a tela padrão do Next "This page could not be found".
 * Mostra contexto visual claro e leva de volta pra rotas válidas.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center space-y-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Erro 404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Página não encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            A URL acessada não existe nesta versão do HALO Prospector.
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-left text-xs space-y-1">
          <p className="text-muted-foreground">Rotas disponíveis:</p>
          <ul className="space-y-0.5 text-foreground font-mono">
            <li>
              <span className="text-muted-foreground">·</span> /
            </li>
            <li>
              <span className="text-muted-foreground">·</span> /leads
            </li>
            <li>
              <span className="text-muted-foreground">·</span> /leads/novo
            </li>
            <li>
              <span className="text-muted-foreground">·</span> /leads/[id]
            </li>
            <li>
              <span className="text-muted-foreground">·</span> /agenda{" "}
              <span className="text-muted-foreground/70">(placeholder)</span>
            </li>
            <li>
              <span className="text-muted-foreground">·</span> /login
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar pro início</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/leads">Ver Leads</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
