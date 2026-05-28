import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function HomePage() {
  const supabase = createClient();
  // Middleware já bloqueia rota não autenticada — aqui user é garantido.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight">HALO Prospector</span>
            <span className="text-xs text-muted-foreground">— V1</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="container flex-1 py-8">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo, {user?.email?.split("@")[0]}
          </h1>

          <div className="text-xs text-muted-foreground border border-border rounded-lg p-4 space-y-1">
            <p className="font-medium text-foreground">Status do projeto</p>
            <p>✓ Etapa 1 — Setup Next.js + Tailwind + shadcn + Supabase</p>
            <p>✓ Etapa 2 — Schema SQL + RLS + Realtime</p>
            <p>✓ Etapa 3 — Auth (login/logout + proteção de rotas)</p>
            <p className="pt-2 text-muted-foreground/70">
              Próxima etapa: CRUD de Leads.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
