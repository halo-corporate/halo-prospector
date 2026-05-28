-- ============================================================================
-- HALO Prospector — Migration 0006 — Informações Internas
-- ============================================================================
-- Registro de dados/credenciais da empresa: CNPJ, dados bancários, telefones,
-- logins, etc. Cada linha tem um valor "público" e opcionalmente um
-- valor_secreto que vem mascarado por default na UI (reveal-on-click).
--
-- SEGURANÇA (V2): valor_secreto é armazenado como texto plain. A proteção
-- vem de:
--   1. RLS por user_id (defesa em profundidade)
--   2. Acesso só com sessão Supabase autenticada
--   3. UI mascara com bullets até o user revelar explicitamente
-- Encriptação at-rest via Supabase Vault fica para V3.
-- ============================================================================

create table if not exists public.informacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Categoria text livre — a UI agrupa por esse campo. Sugestões padrão na
  -- UI: identificacao, bancario, contato, credencial, outro.
  categoria text not null check (length(trim(categoria)) between 1 and 40),

  titulo text not null check (length(trim(titulo)) between 1 and 100),
  -- Valor visível (CNPJ, email, chave PIX, login, etc.)
  valor text not null check (length(trim(valor)) between 1 and 2000),
  -- Valor secreto opcional (senha, token, etc.) — mascarado por default na UI.
  valor_secreto text check (
    valor_secreto is null or length(valor_secreto) between 1 and 2000
  ),
  observacoes text check (observacoes is null or length(observacoes) <= 2000),
  ordem int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.informacoes is 'Informações internas da empresa: dados públicos e credenciais. valor_secreto é mascarado por default na UI.';

create index if not exists informacoes_user_categoria_idx
  on public.informacoes (user_id, categoria, ordem, titulo);

drop trigger if exists trg_informacoes_updated_at on public.informacoes;
create trigger trg_informacoes_updated_at
  before update on public.informacoes
  for each row execute function public.set_updated_at();

alter table public.informacoes enable row level security;

drop policy if exists "informacoes owner select" on public.informacoes;
create policy "informacoes owner select" on public.informacoes for select
  using (auth.uid() = user_id);

drop policy if exists "informacoes owner insert" on public.informacoes;
create policy "informacoes owner insert" on public.informacoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "informacoes owner update" on public.informacoes;
create policy "informacoes owner update" on public.informacoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "informacoes owner delete" on public.informacoes;
create policy "informacoes owner delete" on public.informacoes for delete
  using (auth.uid() = user_id);

-- Realtime
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'informacoes'
    ) then
      alter publication supabase_realtime add table public.informacoes;
    end if;
  end if;
end $$;
