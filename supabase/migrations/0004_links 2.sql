-- ============================================================================
-- HALO Prospector — Migration 0004 — Central de Links
-- ============================================================================
-- Tabela de links salvos manualmente pelo usuário (Notion, Drive, planilhas,
-- Calendar, etc). Single-user via RLS. Sem integração externa; é só um
-- "favoritos" interno.
-- ============================================================================

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 60),
  url text not null check (length(trim(url)) between 1 and 2000),
  descricao text check (descricao is null or length(descricao) <= 200),
  tipo text not null default 'outro',
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.links is 'Central de links — favoritos internos do usuário (URLs salvas manualmente).';

create index if not exists links_user_ordem_idx
  on public.links (user_id, ordem, created_at desc);

drop trigger if exists trg_links_updated_at on public.links;
create trigger trg_links_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

alter table public.links enable row level security;

drop policy if exists "links owner select" on public.links;
create policy "links owner select" on public.links for select
  using (auth.uid() = user_id);

drop policy if exists "links owner insert" on public.links;
create policy "links owner insert" on public.links for insert
  with check (auth.uid() = user_id);

drop policy if exists "links owner update" on public.links;
create policy "links owner update" on public.links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "links owner delete" on public.links;
create policy "links owner delete" on public.links for delete
  using (auth.uid() = user_id);

-- Realtime
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'links'
    ) then
      alter publication supabase_realtime add table public.links;
    end if;
  end if;
end $$;
