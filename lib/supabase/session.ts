import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client server-side COM SESSÃO (anon + cookies) — projeto HALO.
 *
 * Diferente do server.ts (service_role, ignora RLS), este client carrega o
 * JWT do usuário logado via cookies → auth.uid() passa a valer → a RLS morde.
 *
 * Uso (Server Actions / Route Handlers / Server Components):
 *   import { createSessionClient } from "@/lib/supabase/session";
 *   const supabase = createSessionClient();
 *   const { data } = await supabase.from("leads").select("*"); // só do tenant logado
 *
 * NOTA: ainda NÃO é usado por ninguém. É a ferramenta que o login (passo ③) e
 * a troca dos call-sites (fatia 2) vão consumir. O app segue no service_role.
 */
export function createSessionClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component: cookies() é read-only aqui. O refresh efetivo
            // de token acontece no middleware. Engolir é o padrão @supabase/ssr.
          }
        },
      },
    },
  );
}
