import { Settings } from "lucide-react";

export const metadata = { title: "Configurações — HALO Prospector" };
export const dynamic = "force-dynamic";

// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// Sob SSO o HALO não tem login próprio: a senha agora é a do ALIEN. O card
// "Trocar senha" foi escondido (clicar falharia, pois não há sessão Supabase
// do HALO). O componente e a action seguem no disco, só não são renderizados.
export default async function ConfiguracoesPage() {
  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center mt-0.5">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="halo-eyebrow">Conta</p>
          <h1 className="title-display text-3xl sm:text-4xl">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            A conta e a senha são geridas no ALIEN (login único).
          </p>
        </div>
      </div>
    </div>
  );
}
