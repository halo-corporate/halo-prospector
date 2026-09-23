import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente Supabase com a SERVICE ROLE KEY — ignora RLS e NÃO tem sessão de
 * usuário. Use APENAS em código server-side sem usuário logado (ex.: cron de
 * rastreio, que roda sem cookies). NUNCA importar em client component.
 *
 * Gated: se a env var não estiver setada, retorna null (o caller decide o que
 * fazer). A chave é secreta — só existe em runtime de servidor.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
