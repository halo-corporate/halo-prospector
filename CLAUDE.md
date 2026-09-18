# CLAUDE.md — HALO Prospector

Instruções permanentes deste repositório. Ler antes de qualquer alteração.

Constituição do workspace: [`../../CLAUDE.md`](../../CLAUDE.md). Conhecimento durável: [`../../segundo-cerebro/02 — Negócios/HALO.md`](../../segundo-cerebro/02%20—%20Negócios/HALO.md).

O [`README.md`](README.md) cobre setup, migrations e smoke test pós-deploy; este arquivo cobre como trabalhar no código.

---

## 1. O que é

Sistema web **single-user** de prospecção B2B da HALO. Substituiu a planilha de prospecção. V2 em produção em `halo-prospector.vercel.app`.

Módulos: `crm` (era `/leads`, redirecionado), `propostas`, `checklist`, `mensagens`, `links`, `vendas`, `envios`, `influencers`, `configuracoes`, mais a rota pública `app/proposta/[id]`.

---

## 2. Regras inegociáveis

1. **Banco é a única fonte de verdade.** Toda mutação é `await` Server Action; a UI só atualiza após sucesso confirmado. **Sem cache otimista que possa reverter.** Em erro: toast vermelho, e o estado da UI permanece igual ao pré-clique.
2. **Fuso `America/Sao_Paulo` explícito** em toda apresentação. Banco em UTC; a UI converte via `lib/timezone.ts`. **Nunca `new Date().toISOString()` direto em filtro** — sempre pelos helpers.
3. **Sync entre dispositivos** via Supabase Realtime mais fetch em `window.focus` / `visibilitychange`. A RLS garante que cada usuário só recebe evento das próprias linhas.
4. **Single user.** Signup público desligado no Supabase Auth. Usuário novo só pelo dashboard.
5. **Validação dupla** em tudo que muta dado: zod no servidor, `required`/`type` no cliente.

---

## 3. `basePath: "/halo"` e a ponte ALIEN — não reverter

`next.config.js` define `basePath: "/halo"`. Isso **não é sobra** — faz parte de um arranjo multi-zone com SSO sob um app chamado **ALIEN**, e há comentário no arquivo avisando para não reverter.

Existe um **segundo projeto Supabase** ligado por `lib/supabase/alien-server.ts` e `lib/supabase/alien-database.types.ts`. Ao mexer em auth, rota ou client do Supabase, conferir de qual dos dois projetos a chamada sai.

O script `scripts/test-ponte-alien.mjs` existe para verificar essa ponte.

Consequência prática: o cron da Vercel aponta para `/halo/api/cron/rastreio` (`0 9 * * *`), com o prefixo — não para `/api/...`.

---

## 4. Stack

Next.js 14.2.35 App Router + **TypeScript estrito** · Tailwind + shadcn/ui (new-york, tema escuro) · Supabase (Postgres + Auth + Realtime) · zod · `date-fns-tz` · npm (Node 22.22.3 via `fnm`) · Vercel. Integração de envio: **Melhor Envio** por OAuth.

---

## 5. Convenções

```
app/(app)/<rota>/         route group autenticado
components/ui/            shadcn
components/<dominio>/     componentes de feature
lib/<dominio>/queries.ts  leitura
lib/<dominio>/actions.ts  mutação (Server Actions, "use server")
lib/timezone.ts           helpers America/Sao_Paulo
```

- **Queries em `queries.ts`, actions em `actions.ts`**, por domínio. São 16 domínios: leads, propostas, envios, influencers, embalagens, melhor-envio, mensagens, links, interacoes, decisores, categorias, auth e outros.
- Helper síncrono fica em arquivo **sem** `"use server"` (ex.: `lib/verticais/slug.ts`). Arquivo com `"use server"` só exporta função async.
- Imports absolutos por `@/*`.
- Tema escuro padrão. Paleta HALO: preto base, texto branco, **accent único `#0071E3`** — zero âmbar, zero amarelo. Cards `rounded-[18px]` com `border-white/10`.
- `lib/database.types.ts` é **mantido à mão**, não gerado. Migration que muda schema exige atualizar esse arquivo no mesmo commit.

---

## 6. QA

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm run build
```

**Não há teste** (vitest não está instalado). O gate real aqui é o typecheck mais o smoke test pós-deploy do README.

---

## 7. Identidade de commit

```
git config --local user.email gabriel.blborba@gmail.com
git config --local user.name  "Gabriel Borba"
```

Remote: `git@github-halo:gabrielblborba-wq/halo-prospector.git`.

**Atenção:** o repo está hoje no branch `feat/checklist-glass`, não em `main`. Conferir `git branch --show-current` antes de trabalhar.

---

## 8. Migrations

27 arquivos em `supabase/migrations/`, até `0023_envios_destinatario_contato.sql`. Aplicadas **à mão** no SQL Editor, em ordem. Avisos amarelos de `DROP POLICY IF EXISTS` são esperados (idempotência) — "Run anyway".

---

## 9. Fora de escopo até a V3

Integração real com WhatsApp/Instagram API, integração de pagamento, import de CSV/Excel, notificação por e-mail/push, auth multi-user, sugestão automática por IA. Não implementar nem deixar stub — ver [`../../segundo-cerebro/04 — Produto e Decisões/O que não construir.md`](../../segundo-cerebro/04%20—%20Produto%20e%20Decisões/O%20que%20não%20construir.md).

---

## 10. Arquivos duplicados no repo

Existem sobras de cópia com sufixo numérico: `0017_drop_tarefas_urgencia 2.sql`, `next.config 2.js`, `next.config 3.js`, `vercel 2.json`, `tsconfig 2.tsbuildinfo`. **Não são configuração ativa.** Ao editar config, conferir que está mexendo no arquivo sem sufixo.
