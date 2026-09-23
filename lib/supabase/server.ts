// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// O HALO deixou de ter sessão Supabase própria (a PORTA é a sessão do ALIEN,
// validada no middleware). Aqui os dados do HALO são lidos/escritos via
// service-role, ATRÁS do gate de auth do ALIEN — app single-user, só o Gabriel
// cruza (regra de ouro). A chave service-role ignora RLS: é estritamente
// server-only (import "server-only") e NUNCA pode virar NEXT_PUBLIC_.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Identidade fixa do Gabriel no Supabase do HALO (auth.users.id de
 * gabriel@halo.com). Sob SSO não há `auth.uid()` — quem precisava de `user.id`
 * usa esta constante. Casa com o novo default de `user_id` (migration 0024).
 */
export const HALO_USER_ID = "e7fa0ed0-ae90-4c09-92d8-8ca34fed1f1c";

/**
 * Supabase client (service-role) para Server Components, Route Handlers e
 * Server Actions. Sem sessão, sem RLS — o gate do ALIEN é a fronteira.
 *
 * Uso:
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = createClient();
 *   const { data } = await supabase.from("leads").select("*");
 */
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
