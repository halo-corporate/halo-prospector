"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary das rotas autenticadas. Substitui o "Application error: a
 * server-side exception has occurred" genérico do Next por uma tela com
 * detalhes claros, digest do erro e ações pra resolver.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[AppError]", error);
  }, [error]);

  const looksLikeMissingTable =
    /relation .* does not exist|undefined_table|42P01/i.test(error.message);

  return (
    <main className="container py-12 flex items-center justify-center">
      <div className="max-w-xl w-full rounded-[18px] border border-destructive/40 bg-card p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertOctagon className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Erro do servidor
            </p>
            <h1 className="title-display text-xl">
              Não consegui renderizar essa tela
            </h1>
            {error.digest ? (
              <p className="text-xs text-muted-foreground">
                Digest: <span className="font-mono">{error.digest}</span>
              </p>
            ) : null}
          </div>
        </div>

        {looksLikeMissingTable ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
            <p className="font-medium text-primary">
              Provavelmente é migration pendente.
            </p>
            <p className="text-primary/80 text-xs">
              Uma tabela usada por essa tela não existe ainda no Supabase.
              Rode a última migration em{" "}
              <code className="bg-primary/10 px-1 rounded">
                supabase/migrations/
              </code>{" "}
              no SQL Editor do Supabase Dashboard.
            </p>
          </div>
        ) : null}

        {error.message ? (
          <details className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Mensagem técnica
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-foreground/80">
              {error.message}
            </pre>
          </details>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={() => reset()} size="sm">
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar de novo
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar pro Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
