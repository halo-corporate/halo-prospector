# HALO Prospector

Sistema web single-user para prospecção B2B da HALO (haloqring.com).
**V2 completa** em produção: [halo-prospector.vercel.app](https://halo-prospector.vercel.app).

> Substitui a planilha de prospecção do Gabriel. Banco como única fonte de
> verdade, sync entre dispositivos via Supabase Realtime, fuso BR explícito
> em toda apresentação, validação dupla (zod + HTML) em tudo que muta dados.
>
> **V2 entrega**: rebranding visual + módulos de Propostas, Financeiro (DRE
> com PDF), Mensagens-modelo, Central de Links e Informações Internas
> (credenciais com reveal-on-click). Sem integrações externas — dados
> inseridos manualmente.

---

## Stack

| Camada              | Tech                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| Framework           | [Next.js 14](https://nextjs.org/) (App Router) + TypeScript estrito      |
| UI                  | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (new-york, tema escuro) |
| Banco / Auth        | [Supabase](https://supabase.com/) (Postgres + Auth + Realtime, free tier) |
| Validação           | [zod](https://zod.dev/) (server) + HTML5 `required`/`type` (client)      |
| Fuso BR             | [date-fns-tz](https://date-fns.org/) — `America/Sao_Paulo`               |
| Fonte               | Inter via `next/font/google`                                             |
| Deploy              | [Vercel](https://vercel.com/) (free tier)                                |
| Pacote              | npm (testado em Node 22.22.3 via `fnm`)                                  |

---

## Módulos (V1 + V2)

| Módulo / Rota                | O que tem                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**                     | Login email + senha (Supabase Auth). Signup público desabilitado — single user.                                                          |
| **Dashboard** (`/`)          | KPIs (Total, Vencidos, Hoje, Aquecidos), follow-ups vencidos/hoje/próximos 7 dias, checklist da semana, últimas 5 interações, por vertical, por status. |
| **Leads** (`/leads`)         | Lista com filtros (vertical, status, temperatura, UF, busca), ordenação por coluna, CRUD com 17 campos.                                  |
| **Decisores + Interações**   | No detalhe do lead. D1/D2/D3, timeline cronológica reversa, modal de registrar interação com BR→UTC.                                     |
| **Verticais customizáveis**  | 5 defaults seedados + criar nova inline (`+ Nova vertical` no Select).                                                                   |
| **Propostas** (`/propostas`) | **V2** — 4 status pills (Aberto / Negociação / Recusado / Convertido), filtros (cliente, valor mín/máx, datas), botão 1-click "Converter em venda" que cria venda no Financeiro com responsável + comissão custom e linka via `venda_id`. |
| **Financeiro** (`/financeiro`) | **V2** — Tabela vendas com generated columns (bruto/líquido/comissão calculados pelo Postgres). DRE com Faturamento Bruto em destaque + 4 sub-KPIs + MoM com tooltip "MÊS EM ANDAMENTO — COMPARAÇÃO PARCIAL". Breakdowns por responsável (Pedro/Bessa/Davi/Gabriel — mini-barras) e por status. Upload de comprovante inline (Supabase Storage privado + signed URLs 10min + RLS por `user_id`). Exportar PDF via `window.print()` + `@media print` (rota dedicada `/financeiro/dre/print` em light theme). Cancelados excluídos do DRE por default. |
| **Checklist** (`/checklist`) | Tarefas por semana BR (segunda–domingo). Navegação entre semanas. Observações expansíveis por tarefa. "Puxar pendentes da semana anterior". |
| **Agenda** (`/agenda`)       | 3 buckets completos (Vencidos · Hoje · Próximos 7 dias), sem limit, click → detalhe.                                                     |
| **Mensagens-modelo** (`/mensagens`) | **V2** — Biblioteca de templates por canal (WhatsApp/E-mail/Instagram/SMS) e etapa do funil. Variáveis tipo `{nome_cliente}` `{empresa}` `{valor}` destacadas em pill azul HALO. Botão **COPIAR** preserva as variáveis intactas no clipboard. |
| **Links** (`/links`)         | **V2** — Central de links/favoritos. URLs coladas manualmente, agrupadas por tipo (Notion/Drive/Sheets/Calendar/Slack/WhatsApp/etc.), `https://` auto-prepended, ícone por tipo. |
| **Informações Internas** (`/informacoes`) | **V2** — Registro de dados da empresa (CNPJ, bancário, contatos, credenciais). `valor_secreto` mascarado com bullets por default; reveal-on-click; copy preserva valor real. Agrupado por categoria livre. |
| **Sync entre dispositivos**  | Supabase Realtime em todas as 9 tabelas + fetch on `window.focus` / `visibilitychange`. Sem reload manual.                              |
| **Tema (V2)**                | Dark mode default, paleta HALO. **Único accent: `#0071E3`** (zero âmbar/amarelo). Cards `rounded-[18px]` + `border-white/10`. H1/H2 em Helvetica Neue Bold caixa alta. |
| **Error boundaries**         | `/app/(app)/error.tsx` + `app/not-found.tsx` + `app/global-error.tsx` — tudo estilizado, com detecção de migration pendente.            |
| **Persistência rígida**      | Toda mutação é `await` Server Action; UI só atualiza após sucesso confirmado; erro → toast vermelho, estado não muda.                    |

### O que ainda NÃO está implementado (V3+)

- Integração com WhatsApp / Instagram API (envio real de mensagens)
- Integração com Mercado Pago / API de pagamentos
- Import de CSV/Excel
- Notificações por email/push
- Auth multi-user real (hoje `responsavel` em vendas é só categoria, não Auth)
- Encriptação at-rest dos `valor_secreto` via Supabase Vault
- Sugestões automáticas via IA

---

## Setup local

### Pré-requisitos

- **Node 20+** (testado em 22.22.3). Usar `fnm`, `nvm`, ou Homebrew. Garanta que `node` e `npm` estão no `PATH` do shell onde você vai rodar.
- Conta no [Supabase](https://supabase.com/) (free tier) e [Vercel](https://vercel.com/) (free tier).
- Acesso ao repo no GitHub (privado).

### Instalação

```bash
git clone git@github.com:gabrielblborba-wq/halo-prospector.git
cd halo-prospector
cp .env.example .env.local
npm install
```

Edita `.env.local` colando as credenciais do seu projeto Supabase
(URL e `anon public` key — passo a passo abaixo).

```bash
npm run dev   # http://localhost:3000
```

---

## Setup do Supabase (do zero)

### 1. Criar projeto

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Region: **South America (São Paulo)** · Plan: **Free**
3. Anote a database password no seu gerenciador (não vai pro código).

### 2. Rodar migrations

As migrations ficam em [`supabase/migrations/`](supabase/migrations) e devem
ser aplicadas **em ordem**:

| Arquivo                                        | O que faz                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `0001_init.sql`                                | Enums, tabelas `leads` / `decisores` / `interacoes`, RLS por `user_id`, trigger `updated_at`, Realtime |
| `0002_verticais_e_checklist.sql`               | Tabela `verticais` (com seed dos 5 defaults), converte `leads.vertical` enum→text, tabela `tarefas_semanais` |
| `0003_tarefas_observacoes.sql`                 | Adiciona coluna `observacoes` em `tarefas_semanais`                                                |
| `0004_links.sql`                               | **V2** — Tabela `links` (central de favoritos)                                                     |
| `0005_mensagens_templates.sql`                 | **V2** — Enum `mensagem_canal` + tabela `mensagem_templates`                                       |
| `0006_informacoes.sql`                         | **V2** — Tabela `informacoes` (com `valor_secreto` mascarado)                                      |
| `0007_vendas.sql`                              | **V2** — Enums `venda_responsavel`/`canal_pagamento`/`status` + tabela `vendas` com generated columns (bruto/líquido/comissão automáticos via Postgres) |
| `0008_comprovantes_storage.sql`                | **V2** — Bucket privado `comprovantes` no Supabase Storage + 4 RLS policies em `storage.objects`   |
| `0009_propostas.sql`                           | **V2** — Enum `proposta_status` + tabela `propostas` com FK opcional pra `leads` e `vendas` (link 1↔1 quando convertida) |

**Via SQL Editor (recomendado):**

1. **SQL Editor → New query**
2. Cola o conteúdo de cada migration (uma por vez, na ordem)
3. **Run** (Cmd+Enter)
4. Esperado: `Success. No rows returned`

Avisos amarelos `"Potential issue detected"` por causa de `DROP POLICY IF EXISTS`
/ `DROP TRIGGER IF EXISTS` são esperados (idempotência). Clique **Run anyway**.

**Via Supabase CLI (alternativo):**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 3. Configurar Auth

1. **Authentication → Providers → Email**: ON, **Confirm email**: OFF
2. **Authentication → Sign In / Up**: desliga **Allow new users to sign up**
3. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (e depois atualiza pro domínio Vercel)
   - **Redirect URLs**: adiciona `http://localhost:3000/**` e (após deploy) `https://SEU-DOMINIO.vercel.app/**`
4. **Authentication → Users → Add user**:
   - Email + senha forte
   - **Auto Confirm User**: ON

### 4. Copiar credenciais

**Project Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Cole em `.env.local` (não comita — está no `.gitignore`).

> ⚠️ A `service_role` key dá acesso total ao banco (bypass RLS).
> NUNCA subir pro Git nem usar no client. V1 só usa a `anon` key.

---

## Deploy na Vercel

1. **Push do repo no GitHub** (já feito).
2. **vercel.com/dashboard → Add New → Project**.
3. Importa o repositório `halo-prospector` (privado).
4. **Framework Preset**: Next.js (detectado).
5. **Environment Variables**: cola
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. **Deploy**.
7. Após deploy, copia o domínio (ex: `halo-prospector.vercel.app`) e:
   - Volta no Supabase → **Authentication → URL Configuration**
   - Atualiza **Site URL** pro domínio Vercel
   - Adiciona em **Redirect URLs**: `https://halo-prospector.vercel.app/**`

> Vercel faz auto-deploy a cada push em `main`. Se algum deploy ficar
> bloqueado por "commit author email not valid", checar `git config user.email`
> — precisa bater com um email verificado na conta GitHub.

---

## Estrutura

```
halo-prospector/
├── app/
│   ├── (app)/                       # Route group autenticado (layout + middleware)
│   │   ├── layout.tsx               # Header + nav + email + logout + RealtimeRefresher
│   │   ├── page.tsx                 # Dashboard
│   │   ├── error.tsx                # Error boundary com detecção de migration pendente
│   │   ├── realtime-refresher.tsx   # Sync via Supabase Realtime + fetch on focus
│   │   ├── tarefas-semana-widget.tsx
│   │   ├── leads/
│   │   │   ├── page.tsx · filters · leads-table · lead-form
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/page.tsx · delete-lead-button · not-found
│   │   ├── checklist/page.tsx · copy-pending-button
│   │   └── agenda/page.tsx
│   ├── login/                       # Página pública
│   ├── globals.css                  # Paleta HALO via CSS vars
│   ├── layout.tsx                   # Tema dark + Inter + Sonner toaster
│   ├── not-found.tsx                # 404 customizado
│   └── global-error.tsx
├── components/
│   ├── ui/                          # shadcn (button, input, dialog, alert-dialog, table, etc.)
│   ├── auth/logout-button.tsx
│   ├── leads/vertical-select.tsx    # Select com "+ Nova vertical" inline
│   ├── decisores/                   # decisor-card · add-decisor-form
│   ├── interacoes/                  # add-interacao-dialog · interacoes-timeline
│   └── checklist/                   # checklist-item (com observações) · add-tarefa-input
├── lib/
│   ├── database.types.ts            # Tipos do banco (mantidos à mão)
│   ├── timezone.ts                  # Helpers America/Sao_Paulo (BR_TZ, formatBR, etc.)
│   ├── utils.ts                     # cn() do shadcn
│   ├── supabase/                    # client (browser) · server · middleware
│   ├── auth/actions.ts              # logoutAction
│   ├── leads/                       # queries · actions · schema (zod) · badge (classes)
│   ├── decisores/                   # queries · actions
│   ├── interacoes/                  # queries · actions
│   ├── verticais/                   # queries · actions · slug helper
│   └── tarefas/                     # queries · actions
├── supabase/migrations/             # 0001 · 0002 · 0003
├── middleware.ts                    # Refresh de sessão + redirect /login
├── tailwind.config.ts
├── components.json                  # shadcn
└── .env.example
```

---

## Regras inegociáveis (decisões de projeto)

1. **Banco é a única fonte de verdade.** Toda mutação é `await` Server Action; UI só atualiza após sucesso confirmado. Sem cache otimista que possa reverter. Em erro: toast vermelho, estado da UI permanece igual ao pré-clique.
2. **Fuso `America/Sao_Paulo` explícito** em toda apresentação. Banco em UTC; UI sempre converte via `lib/timezone.ts`. Nunca `new Date().toISOString()` direto em filtros — sempre passar pelos helpers.
3. **Sync entre dispositivos** via Supabase Realtime + fetch on `window.focus` / `visibilitychange`. RLS garante que cada user só recebe eventos das próprias linhas.
4. **Single user.** Supabase Auth com signup público OFF. Adicionar novo usuário só via dashboard.
5. **Construção em etapas validadas.** Histórico no `git log`:

   | Commit  | Etapa                                                  |
   | ------- | ------------------------------------------------------ |
   | e667128 | 1. Setup Next.js + Tailwind + shadcn + Supabase        |
   | 78b6b21 | 2. Schema SQL + RLS + Realtime                         |
   | bcc4a27 | 3. Auth (login/logout + proteção de rotas)             |
   | edb0da5 | 4. CRUD de Leads                                       |
   | 4201ff9 | extra. Verticais customizáveis + checklist semanal     |
   | 64be8e5 | 5. Decisores + Timeline de Interações                  |
   | 41ff6cf | 6. Dashboard (follow-ups + atividade recente)          |
   | ef4c777 | 7. `/agenda` completa (3 buckets)                      |
   | 4406143 | 8. Realtime + fetch on focus                           |
   | 357f65a | 9. Observações por tarefa (+ migration 0003)           |

---

## Convenções

- Tema escuro padrão (classe `dark` no `<html>`).
- Paleta: preto base, branco texto, azul HALO `#0071E3` em CTAs (`bg-primary`).
- Imports absolutos via alias `@/*`.
- Server Actions em arquivos com `"use server"` — só funções async exportadas.
- Helpers sync ficam em arquivos sem `"use server"` (ex: `lib/verticais/slug.ts`).
- Queries ficam em `lib/<dominio>/queries.ts`, actions em `lib/<dominio>/actions.ts`.
- Components shadcn em `components/ui/`; componentes de feature em `components/<dominio>/`.

---

## Scripts

```bash
npm run dev        # Next dev (http://localhost:3000)
npm run build      # Next build (production)
npm run start      # Next start (production server local)
npm run typecheck  # tsc --noEmit (typecheck só)
npm run lint       # next lint
```

---

## Smoke test pós-deploy

Mínimo pra confirmar que está tudo OK em produção:

1. `https://halo-prospector.vercel.app` → redireciona pra `/login`
2. Loga com o usuário criado no Supabase
3. Dashboard carrega com KPIs zerados (se banco vazio) ou populados
4. `+ Novo lead` → criar → cair no detalhe
5. Adicionar decisor + registrar interação
6. Voltar pra `/leads` → lead aparece com D1 e última interação
7. `/agenda` → bucket Vencidos/Hoje/Próximos 7 dias funciona
8. `/checklist` → adicionar tarefa, marcar concluída, adicionar observação
9. Abrir em 2 tabs → mudança em uma reflete na outra em ~500ms (Realtime)

---

V1 completa. PRs / issues no GitHub: [gabrielblborba-wq/halo-prospector](https://github.com/gabrielblborba-wq/halo-prospector).
