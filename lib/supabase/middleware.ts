// PORTÃO DO HALO — valida a sessão do próprio HALO (auth nativo).
// Substituiu o gate SSO do ALIEN (fatia 3a.4). O login vive em /halo/login
// (app/login/actions.ts, via createSessionClient). Reverter isto volta o
// portão pro ALIEN (commit anterior).
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  const rawPath = request.nextUrl.pathname;
  const path = rawPath.startsWith("/halo")
    ? rawPath.slice("/halo".length) || "/"
    : rawPath;

  // Skip 1: cron do Vercel (sem cookies, protegido por CRON_SECRET na rota).
  if (path.startsWith("/api/cron")) {
    return NextResponse.next({ request });
  }

  // Skip 2 (ANTI-LOOP): a própria tela de login não passa pelo gate,
  // senão deslogado -> /halo/login -> redirect -> /halo/login -> loop.
  if (path === "/login") {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Redireciona pra /halo/login. NextResponse.redirect NÃO soma o basePath
  // no middleware -> caminho explícito /halo/login. Preserva ?redirect= pra
  // loginAction devolver o usuário pra rota que ele tentou abrir.
  const loginRedirect = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/halo/login";
    loginUrl.search = "";
    const destino = "/halo" + path + request.nextUrl.search;
    loginUrl.searchParams.set("redirect", destino);
    return NextResponse.redirect(loginUrl);
  };

  // Falha segura: sem as envs do HALO, não libera.
  if (!supabaseUrl || !supabaseAnon) {
    return loginRedirect();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginRedirect();
  }

  return response;
}
