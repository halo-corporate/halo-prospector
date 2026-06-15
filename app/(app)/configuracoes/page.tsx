import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrocarSenhaCard } from "@/components/configuracoes/trocar-senha-card";

export const metadata = { title: "Configurações — HALO Prospector" };
export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center mt-0.5">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="halo-eyebrow">Conta</p>
          <h1 className="title-display text-3xl sm:text-4xl">Configurações</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <TrocarSenhaCard />
    </div>
  );
}
