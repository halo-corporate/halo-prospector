# HALO Prospector

Sistema web single-user para prospecção B2B da HALO (haloqring.com).

> **Status atual**: Etapa 1 — setup do projeto. As próximas etapas (schema, auth,
> CRUD, dashboard, agenda) serão adicionadas em sequência.

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
cp .env.example .env.local      # preencher com credenciais Supabase
npm install
npm run dev                     # http://localhost:3000
```

## Setup do Supabase

> Passo a passo completo será adicionado na Etapa 2 (schema + migrations).
> Por enquanto, basta criar um projeto vazio para já preparar as env vars:

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e crie um projeto novo.
2. Em **Project Settings → API**, copie `URL` e `anon public key`.
3. Cole em `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

## Deploy na Vercel

> Detalhes virão na Etapa 9. Resumo:
> 1. Push do repo no GitHub.
> 2. Importar projeto na Vercel.
> 3. Configurar as duas env vars acima.
> 4. Deploy.

## Estrutura

```
halo-prospector/
├── app/                     # App Router (rotas, layout, globals.css)
├── components/ui/           # Componentes shadcn/ui
├── lib/
│   ├── supabase/            # Clients para browser / server / middleware
│   ├── timezone.ts          # Helpers America/Sao_Paulo (BR_TZ, formatBR, etc.)
│   └── utils.ts             # cn() helper do shadcn
├── supabase/migrations/     # SQL migrations (preenchido na Etapa 2)
├── middleware.ts            # Refresh de sessão Supabase
└── .env.example
```

## Regras inegociáveis (decisões de projeto)

1. **Banco é a única fonte de verdade.** Mutações são `await`; UI só atualiza após sucesso.
2. **Fuso `America/Sao_Paulo`** sempre explícito via `lib/timezone.ts`.
3. **Sync entre dispositivos** via Supabase Realtime + fetch on focus (Etapa 8).
4. **Single user** com Supabase Auth (email + senha).

## Convenções

- Tema escuro por padrão (classe `dark` no `<html>`).
- Paleta: preto base, branco texto, azul HALO `#0071E3` em CTAs (`bg-primary`).
- Fonte: Inter via `next/font`.
- Imports absolutos via alias `@/*`.

---

V1 não inclui: integração WhatsApp/IG, import CSV, notificações, multi-user, gráficos, export. Tudo isso é V2.
