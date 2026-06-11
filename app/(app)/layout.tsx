import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { HaloLockup } from "@/components/halo-lockup";
import { AppNav } from "./app-nav";
import { RealtimeRefresher } from "./realtime-refresher";
import { WelcomeSplash } from "./welcome-splash";

/**
 * Layout compartilhado das rotas autenticadas.
 * O middleware já garante que `user` existe quando chega aqui — mas
 * fazemos getUser() também para usar o email no header.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sync entre abas/dispositivos via Supabase Realtime + fetch on focus */}
      <RealtimeRefresher />
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-14 gap-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center hover:opacity-80"
            >
              {/* Mobile: só rings + HALO. Desktop (sm+): lockup completo. */}
              <HaloLockup className="h-5 w-auto text-foreground sm:hidden" showProspector={false} />
              <HaloLockup className="h-5 w-auto text-foreground hidden sm:block" />
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <WelcomeSplash />
    </div>
  );
}
