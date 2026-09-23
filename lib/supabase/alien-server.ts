// ⚠️ PONTE DE DADOS PRO ALIEN (Fase 5-B) — server-only.
// Client Supabase apontando pro projeto do ALIEN (gvgytwptlcufzcmgsauz), em
// service-role, pra ler/escrever a tabela `tasks` (fonte única do checklist).
// É IRMÃO dos clients existentes (client/server/admin/middleware), que falam com
// o banco do HALO — este NÃO substitui nenhum deles.
//
// service-role ignora RLS: estritamente server-only (`import "server-only"`) e a
// chave NUNCA pode virar NEXT_PUBLIC_. ALIEN_SUPABASE_SERVICE_ROLE_KEY só existe
// em runtime de servidor (Production + Preview na Vercel; ausente em Development).
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { AlienDatabase } from "./alien-database.types";

/**
 * Client de service-role pro banco do ALIEN. Sem sessão, sem RLS — atrás do
 * gate SSO do ALIEN (regra de ouro: só o Gabriel cruza).
 *
 * Uso (server-side apenas):
 *   import { createAlienClient } from "@/lib/supabase/alien-server";
 *   const alien = createAlienClient();
 *   const { data } = await alien.from("tasks").select("*").eq("system", "HALO");
 */
export function createAlienClient() {
  return createSupabaseClient<AlienDatabase>(
    process.env.ALIEN_SUPABASE_URL!,
    process.env.ALIEN_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
