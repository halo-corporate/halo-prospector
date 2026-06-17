// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// Este middleware deixou de validar a sessão do HALO e passou a validar a
// sessão do ALIEN (a PORTA do login único). Reverter pro auth do HALO quebra
// o SSO e tranca o Gabriel pra fora.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * ALIEN Fase 2 / Opção C — SSO de login único.
 *
 * O HALO deixou de ter login próprio. A PORTA é a sessão do ALIEN. Este
 * middleware valida o cookie de sessão do ALIEN (`sb-<ref-alien>-auth-token`,
 * encaminhado pelo rewrite do mesmo domínio apex) chamando `getUser()` contra
 * o Supabase do ALIEN — o que também REFRESCA o token (modo de falha #4: o
 * Gabriel não pode ser jogado pra fora depois de 1h dentro do /halo). Sem
 * sessão ALIEN válida → redireciona pro `/login` do ALIEN, NUNCA pro login do
 * HALO (que não existe mais).
 *
 * Os dados do HALO são lidos server-side via service-role (lib/supabase/server.ts),
 * atrás deste portão — app single-user, só o Gabriel cruza (regra de ouro).
 */
export async function updateSession(request: NextRequest) {
  // Com basePath '/halo', o pathname pode ou não trazer o prefixo dependendo
  // da versão do Next — normaliza removendo-o pra a lógica abaixo.
  const rawPath = request.nextUrl.pathname;
  const path = rawPath.startsWith("/halo")
    ? rawPath.slice("/halo".length) || "/"
    : rawPath;

  // Cron (Vercel) roda sem cookies, batendo na própria URL do HALO. Protege-se
  // com CRON_SECRET dentro da rota — não pode cair no gate de auth.
  if (path.startsWith("/api/cron")) {
    return NextResponse.next({ request });
  }

  const alienUrl = process.env.ALIEN_SUPABASE_URL;
  const alienAnon = process.env.ALIEN_SUPABASE_ANON_KEY;
  const alienBase =
    process.env.ALIEN_BASE_URL ?? "https://alien-eosin-nu.vercel.app";

  const loginRedirect = () =>
    NextResponse.redirect(new URL("/login", alienBase));

  // Falha segura: sem as envs do ALIEN, NÃO libera — manda pro login do ALIEN.
  if (!alienUrl || !alienAnon) {
    return loginRedirect();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(alienUrl, alienAnon, {
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

  // getUser() revalida o token no servidor do Supabase do ALIEN + refresca.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginRedirect();
  }

  return response;
}
