# HALO Prospector

Sistema web single-user para prospecção B2B da HALO (haloqring.com).

> **Status atual**: Etapa 2 — schema do banco pronto (`supabase/migrations/0001_init.sql`).
> Próxima etapa: Auth (login/logout).

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (tema escuro)
- [Supabase](https://supabase.com/) — Postgres, Auth e Realtime
- [date-fns-tz](https://date-fns.org/) — fuso `America/Sao_Paulo` em toda apresentação
- Deploy: [Vercel](https://vercel.com/) (frontend) + Supabase (backend), ambos free tier

## Rodando localmente

Pré-requisitos: Node 20+ (testado em 22.22.3 via `fnm`).

```bash
cd halo-prospector
cp .env.example .env.local      # preencher com credenciais Supabase (ver abaixo)
npm install
npm run dev                     # http://localhost:3000
```

## Setup do Supabase — passo a passo completo

### 1. Criar o projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New project**.
2. Preencha:
   - **Name**: `halo-prospector` (ou outro)
   - **Database password**: gere uma forte e guarde no seu gerenciador de senhas — **não vai pro código**, só uso administrativo.
   - **Region**: `South America (São Paulo)` — menor latência pra você.
   - **Plan**: Free.
3. Aguarde o provisionamento (1–2 min).

### 2. Rodar a migration (criar tabelas, enums, RLS, realtime)

**Opção A — SQL Editor (mais simples, recomendado pra V1):**

1. No menu lateral do projeto, abra **SQL Editor → New query**.
2. Cole o conteúdo inteiro de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Clique em **Run**.
4. Espera: `Success. No rows returned`.
5. Conferir em **Database → Tables** que existem `leads`, `decisores`, `interacoes` e em **Database → Enums** que existem os 6 enums (`lead_vertical`, `lead_status`, etc.).
6. Conferir em **Authentication → Policies** que cada uma das 3 tabelas tem 4 policies (select/insert/update/delete) e RLS está **enabled**.

**Opção B — Supabase CLI (avançado, opcional):**

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

### 3. Configurar Authentication

Como o sistema é só pra você (single user), vamos **desabilitar signup público** e criar seu usuário manualmente.

1. Em **Authentication → Providers**, garanta que **Email** está habilitado e que **Confirm email** está OFF (mais cômodo pro setup inicial — você pode ligar depois).
2. Em **Authentication → Sign In / Up → Allow new users to sign up**: **OFF**.
3. Em **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (vai mudar quando subir na Vercel).
   - **Redirect URLs**: adicionar `http://localhost:3000/**` e (depois) `https://SEU-DOMINIO.vercel.app/**`.
4. Criar o usuário (você):
   - **Authentication → Users → Add user → Create new user**.
   - Email: seu email; Password: forte; **Auto Confirm User**: ON.
   - Anote o email/senha — é com isso que você vai logar no app na Etapa 3.

### 4. Copiar credenciais pro `.env.local`

1. **Project Settings → API**.
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. No projeto local, copie `.env.example` pra `.env.local` e cole os valores.

> ⚠️ A `service_role` key dá acesso total ao banco (bypass RLS). **NUNCA** subir pro Git nem usar no client. A V1 só usa a `anon` key.

### 5. Smoke test do schema (opcional, mas recomendado)

No **SQL Editor**, com o usuário criado e logado no contexto, rode:

```sql
-- Tem que retornar 0 linhas (RLS bloqueando o anon)
select count(*) from public.leads;
```

E pra confirmar que enums foram criados:

```sql
select enum_range(null::public.lead_status);
-- esperado: {novo,pesquisando,tentativa_contato,em_qualificacao,aquecido,passado_closer,ganho,perdido,descartado}
```

## Deploy na Vercel

> Detalhes virão na Etapa 9. Resumo:
> 1. Push do repo no GitHub (já feito ✓).
> 2. Importar projeto na Vercel.
> 3. Configurar as duas env vars do Supabase em **Project Settings → Environment Variables**.
> 4. Atualizar **Site URL** e **Redirect URLs** no Supabase com o domínio da Vercel.

## Estrutura

```
halo-prospector/
├── app/                          # App Router (rotas, layout, globals.css)
├── components/ui/                # Componentes shadcn/ui
├── lib/
│   ├── database.types.ts         # Types espelhando o SQL (manuais, sem CLI)
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient<Database>
│   │   ├── server.ts             # createServerClient<Database>
│   │   └── middleware.ts         # refresh de sessão
│   ├── timezone.ts               # Helpers America/Sao_Paulo
│   └── utils.ts                  # cn() helper do shadcn
├── supabase/migrations/
│   └── 0001_init.sql             # schema completo + RLS + realtime
├── middleware.ts                 # refresh global de sessão
└── .env.example
```

## Modelo de dados

3 tabelas, todas com `user_id` (FK pra `auth.users`) e RLS por `auth.uid() = user_id`.

| Tabela        | Campos-chave                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| `leads`       | empresa, vertical (enum), cidade, estado, status (enum), temperatura, follow-up |
| `decisores`   | lead_id (FK), nome, cargo, prioridade (d1/d2/d3), contatado                  |
| `interacoes`  | lead_id (FK), decisor_id (FK opcional), data_hora, canal, tipo, resumo       |

Detalhes completos no SQL: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Regras inegociáveis (decisões de projeto)

1. **Banco é a única fonte de verdade.** Mutações são `await`; UI só atualiza após sucesso.
2. **Fuso `America/Sao_Paulo`** sempre explícito via `lib/timezone.ts`.
3. **Sync entre dispositivos** via Supabase Realtime + fetch on focus (Etapa 8).
4. **Single user** com Supabase Auth (email + senha). Signup público desligado.

## Convenções

- Tema escuro por padrão (classe `dark` no `<html>`).
- Paleta: preto base, branco texto, azul HALO `#0071E3` em CTAs (`bg-primary`).
- Fonte: Inter via `next/font`.
- Imports absolutos via alias `@/*`.

---

V1 não inclui: integração WhatsApp/IG, import CSV, notificações, multi-user, gráficos, export. Tudo isso é V2.
