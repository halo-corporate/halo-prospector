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

  // Redireciona pra tela de login. GOTCHA do basePath: no Next 14, tanto o
  // NextURL (aqui) quanto o redirect() de Server Action (na loginAction)
  // RE-SOMAM o basePath "/halo" na serialização. Por isso pathname e o valor
  // de `next` vão RELATIVOS (sem /halo) — senão dobra pra /halo/halo/...
  // O param é `next` porque é o que a tela de login (app/login) lê.
  const loginRedirect = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
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
