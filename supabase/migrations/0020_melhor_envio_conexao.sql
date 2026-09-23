-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0020 — conexão OAuth com o Melhor Envio
--
-- V4 PR 4a (integração Melhor Envio, fatia 1 = só a conexão). Guarda os tokens
-- OAuth 2.0 (authorization code) da conta do usuário. App single-user, então é
-- 1 linha por usuário (PK = user_id). Próximas fatias (cotação, etiqueta,
-- rastreio, cron) leem o access_token daqui e renovam pelo refresh_token.
--
-- Tokens são sensíveis: RLS owner-scoped garante que só o dono lê/escreve.
-- `ambiente` registra se o token é de sandbox ou produção (não misturar).
--
-- Idempotente: IF NOT EXISTS / DO blocks. Aditiva (expand) — segura em prod
-- compartilhado.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.melhor_envio_conexao (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,

  access_token text not null,
  refresh_token text not null,
  token_type text not null default 'Bearer',
  scope text,
  -- 'sandbox' | 'production' — qual ambiente gerou estes tokens.
  ambiente text not null default 'sandbox'
    check (ambiente in ('sandbox', 'production')),
  -- Quando o access_token expira (renovar via refresh_token antes disso).
  expires_at timestamptz not null,

  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.melhor_envio_conexao is 'Tokens OAuth do Melhor Envio (owner-scoped, 1 linha por usuário).';

drop trigger if exists trg_melhor_envio_conexao_updated_at on public.melhor_envio_conexao;
create trigger trg_melhor_envio_conexao_updated_at
  before update on public.melhor_envio_conexao
  for each row execute function public.set_updated_at();

alter table public.melhor_envio_conexao enable row level security;

drop policy if exists "me_conexao owner select" on public.melhor_envio_conexao;
create policy "me_conexao owner select"
  on public.melhor_envio_conexao for select
  using (auth.uid() = user_id);

drop policy if exists "me_conexao owner insert" on public.melhor_envio_conexao;
create policy "me_conexao owner insert"
  on public.melhor_envio_conexao for insert
  with check (auth.uid() = user_id);

drop policy if exists "me_conexao owner update" on public.melhor_envio_conexao;
create policy "me_conexao owner update"
  on public.melhor_envio_conexao for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "me_conexao owner delete" on public.melhor_envio_conexao;
create policy "me_conexao owner delete"
  on public.melhor_envio_conexao for delete
  using (auth.uid() = user_id);
