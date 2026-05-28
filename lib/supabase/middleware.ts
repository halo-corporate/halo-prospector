import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refresh da sessão do Supabase no middleware do Next.
 * Será usado a partir da Etapa 3 (Auth) para proteger rotas autenticadas
 * e manter tokens vivos entre requisições.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: usar getUser() (não getSession()) — getUser revalida o token
  // no servidor do Supabase. Necessário para segurança no middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // NOTA: a proteção de rotas será adicionada na Etapa 3 (Auth).
  // Por enquanto, só refrescamos cookies.
  void user;

  return supabaseResponse;
}
