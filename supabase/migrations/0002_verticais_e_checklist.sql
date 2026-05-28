-- ============================================================================
-- HALO Prospector — Migration 0002
-- ============================================================================
-- 1. Cria tabela `verticais` (registro editável de verticais por usuário).
--    Seeda os 5 defaults para cada usuário existente.
-- 2. Converte `leads.vertical` de enum para text (referencia slug em verticais).
-- 3. Dropa o enum public.lead_vertical (não é mais necessário).
-- 4. Cria tabela `tarefas_semanais` para o checklist semanal.
-- 5. RLS, índices, triggers e Realtime nos dois novos recursos.
--
-- IDEMPOTENTE: pode rodar duas vezes sem quebrar (usa IF NOT EXISTS / DO blocks).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela verticais
-- ----------------------------------------------------------------------------
create table if not exists public.verticais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null,
  label text not null,
  is_default boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, slug),
  check (slug ~ '^[a-z][a-z0-9_]*$'),
  check (length(slug) between 2 and 40),
  check (length(trim(label)) between 1 and 60)
);

comment on table public.verticais is 'Verticais de prospeccao por usuario. Os 5 defaults vem seedados; o usuario pode criar novas.';

create index if not exists verticais_user_ordem_idx on public.verticais (user_id, ordem, label);

drop trigger if exists trg_verticais_updated_at on public.verticais;
create trigger trg_verticais_updated_at
  before update on public.verticais
  for each row execute function public.set_updated_at();

alter table public.verticais enable row level security;

drop policy if exists "verticais owner select" on public.verticais;
create policy "verticais owner select"
  on public.verticais for select
  using (auth.uid() = user_id);

drop policy if exists "verticais owner insert" on public.verticais;
create policy "verticais owner insert"
  on public.verticais for insert
  with check (auth.uid() = user_id);

drop policy if exists "verticais owner update" on public.verticais;
create policy "verticais owner update"
  on public.verticais for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "verticais owner delete" on public.verticais;
create policy "verticais owner delete"
  on public.verticais for delete
  using (auth.uid() = user_id);

-- Seed dos 5 defaults para todos os usuários já existentes
insert into public.verticais (user_id, slug, label, is_default, ordem)
select u.id, v.slug, v.label, true, v.ordem
from auth.users u
cross join (
  values
    ('clinicas_medicas', 'Clínicas Médicas', 1),
    ('academias',        'Academias & Studios', 2),
    ('wellness',         'Wellness', 3),
    ('corporativo',      'Corporativo (Tech)', 4),
    ('turismo_sono',     'Turismo do Sono', 5)
) as v(slug, label, ordem)
on conflict (user_id, slug) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Converter leads.vertical de enum para text
-- ----------------------------------------------------------------------------
-- Só converte se a coluna ainda for do tipo enum (idempotente).
do $$
declare
  col_type text;
begin
  select udt_name into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'leads' and column_name = 'vertical';

  if col_type = 'lead_vertical' then
    alter table public.leads alter column vertical type text using vertical::text;
  end if;
end $$;

-- Dropa o enum se não estiver mais sendo usado por nenhuma coluna
do $$
begin
  if exists (select 1 from pg_type where typname = 'lead_vertical')
     and not exists (
       select 1 from information_schema.columns
       where udt_name = 'lead_vertical'
     )
  then
    drop type public.lead_vertical;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Tabela tarefas_semanais (checklist semanal)
-- ----------------------------------------------------------------------------
create table if not exists public.tarefas_semanais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Data da segunda-feira da semana à qual a tarefa pertence (fuso BR).
  -- Indexada para queries por semana atual / passadas.
  semana date not null,

  texto text not null check (length(trim(texto)) between 1 and 200),
  concluida boolean not null default false,
  concluida_em timestamptz,
  ordem int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tarefas_semanais is 'Checklist semanal pessoal (segunda a domingo, fuso BR).';

create index if not exists tarefas_user_semana_idx
  on public.tarefas_semanais (user_id, semana, ordem, created_at);

drop trigger if exists trg_tarefas_semanais_updated_at on public.tarefas_semanais;
create trigger trg_tarefas_semanais_updated_at
  before update on public.tarefas_semanais
  for each row execute function public.set_updated_at();

alter table public.tarefas_semanais enable row level security;

drop policy if exists "tarefas owner select" on public.tarefas_semanais;
create policy "tarefas owner select"
  on public.tarefas_semanais for select
  using (auth.uid() = user_id);

drop policy if exists "tarefas owner insert" on public.tarefas_semanais;
create policy "tarefas owner insert"
  on public.tarefas_semanais for insert
  with check (auth.uid() = user_id);

drop policy if exists "tarefas owner update" on public.tarefas_semanais;
create policy "tarefas owner update"
  on public.tarefas_semanais for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tarefas owner delete" on public.tarefas_semanais;
create policy "tarefas owner delete"
  on public.tarefas_semanais for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'verticais'
    ) then
      alter publication supabase_realtime add table public.verticais;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tarefas_semanais'
    ) then
      alter publication supabase_realtime add table public.tarefas_semanais;
    end if;
  end if;
end $$;
