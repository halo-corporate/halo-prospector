-- ============================================================================
-- HALO Prospector — Migration 0005 — Mensagens-modelo
-- ============================================================================
-- Biblioteca de templates de mensagem (WhatsApp/Email/IG/SMS) por etapa do
-- funil. Variáveis no corpo no formato {nome_cliente}, {empresa}, etc., são
-- destacadas visualmente na UI mas preservadas no clipboard pra serem
-- substituídas manualmente.
-- ============================================================================

-- Enum de canal
do $$ begin
  if not exists (select 1 from pg_type where typname = 'mensagem_canal') then
    create type public.mensagem_canal as enum (
      'whatsapp', 'email', 'instagram', 'sms', 'outro'
    );
  end if;
end $$;

create table if not exists public.mensagem_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 100),
  canal public.mensagem_canal not null default 'whatsapp',
  -- Etapa do funil é text livre — UI sugere lead_status mas usuário pode
  -- digitar "primeira_abordagem", "reativacao", etc. Nullable se for genérico.
  etapa_funil text check (etapa_funil is null or length(trim(etapa_funil)) between 1 and 60),
  -- Assunto só faz sentido pra email — opcional sempre.
  assunto text check (assunto is null or length(assunto) <= 200),
  corpo text not null check (length(trim(corpo)) between 1 and 4000),
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mensagem_templates is 'Templates de mensagem reutilizáveis por canal/etapa do funil.';

create index if not exists mensagem_templates_user_idx
  on public.mensagem_templates (user_id, ordem, created_at desc);
create index if not exists mensagem_templates_user_canal_idx
  on public.mensagem_templates (user_id, canal);

drop trigger if exists trg_mensagem_templates_updated_at on public.mensagem_templates;
create trigger trg_mensagem_templates_updated_at
  before update on public.mensagem_templates
  for each row execute function public.set_updated_at();

alter table public.mensagem_templates enable row level security;

drop policy if exists "mensagens owner select" on public.mensagem_templates;
create policy "mensagens owner select" on public.mensagem_templates for select
  using (auth.uid() = user_id);

drop policy if exists "mensagens owner insert" on public.mensagem_templates;
create policy "mensagens owner insert" on public.mensagem_templates for insert
  with check (auth.uid() = user_id);

drop policy if exists "mensagens owner update" on public.mensagem_templates;
create policy "mensagens owner update" on public.mensagem_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mensagens owner delete" on public.mensagem_templates;
create policy "mensagens owner delete" on public.mensagem_templates for delete
  using (auth.uid() = user_id);

-- Realtime
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagem_templates'
    ) then
      alter publication supabase_realtime add table public.mensagem_templates;
    end if;
  end if;
end $$;
