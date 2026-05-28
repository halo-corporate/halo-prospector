import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">HALO Prospector</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de prospecção B2B — V1
          </p>
        </div>

        <div className="text-xs text-muted-foreground border border-border rounded-lg p-4 text-left space-y-1">
          <p className="font-medium text-foreground">Etapa 1 — setup concluído</p>
          <p>✓ Next.js 14 + TypeScript</p>
          <p>✓ Tailwind + shadcn/ui (tema escuro)</p>
          <p>✓ Supabase client</p>
          <p>✓ Fuso America/Sao_Paulo</p>
          <p className="pt-2 text-muted-foreground/70">
            Próxima etapa: schema SQL + Auth.
          </p>
        </div>

        <Button>Tudo certo</Button>
      </div>
    </main>
  );
}
