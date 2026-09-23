-- ============================================================================
-- HALO Prospector — Migration 0001: schema inicial
-- ============================================================================
-- Cria enums, tabelas (leads / decisores / interacoes), indexes, trigger de
-- updated_at, RLS (Row Level Security) restringindo tudo a auth.uid() = user_id,
-- e publicação Realtime para sync entre dispositivos.
--
-- Como rodar:
--   Opção A (SQL Editor): copiar e colar tudo no SQL Editor do Supabase e Run.
--   Opção B (Supabase CLI): supabase db push (com este arquivo em
--                           supabase/migrations/0001_init.sql).
--
-- Idempotente o suficiente para re-execução em dev: usa IF NOT EXISTS sempre que
-- possível e DROP TRIGGER IF EXISTS antes de criar.
-- ============================================================================

-- Extensão para gen_random_uuid() (já vem habilitada em Supabase, mas garantimos)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'lead_vertical') then
    create type public.lead_vertical as enum (
      'clinicas_medicas',
      'academias',
      'wellness',
      'corporativo',
      'turismo_sono'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum (
      'novo',
      'pesquisando',
      'tentativa_contato',
      'em_qualificacao',
      'aquecido',
      'passado_closer',
      'ganho',
      'perdido',
      'descartado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_temperatura') then
    create type public.lead_temperatura as enum ('frio', 'morno', 'quente');
  end if;

  if not exists (select 1 from pg_type where typname = 'decisor_prioridade') then
    create type public.decisor_prioridade as enum ('d1', 'd2', 'd3');
  end if;

  if not exists (select 1 from pg_type where typname = 'interacao_canal') then
    create type public.interacao_canal as enum (
      'whatsapp', 'instagram', 'email', 'telefone', 'presencial', 'outro'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'interacao_tipo') then
    create type public.interacao_tipo as enum (
      'envio_mensagem',
      'resposta_recebida',
      'ligacao_atendida',
      'ligacao_nao_atendida',
      'reuniao',
      'nota_interna'
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- HELPER: trigger function para updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TABELA: leads
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  empresa text not null,
  vertical public.lead_vertical not null,
  cidade text,
  estado text check (estado is null or length(estado) = 2),
  bairro_regiao text,
  sub_nicho text,
  site text,
  instagram text,
  telefone text,
  email text,
  ticket_estimado int check (ticket_estimado is null or ticket_estimado >= 0),

  status public.lead_status not null default 'novo',
  temperatura public.lead_temperatura,
  proximo_passo text,
  proximo_followup timestamptz,
  motivo_perda text,
  observacoes text
);

comment on table public.leads is 'Empresas/leads em prospecção. Single user via RLS por user_id.';

create index if not exists leads_user_status_idx on public.leads (user_id, status);
create index if not exists leads_user_vertical_idx on public.leads (user_id, vertical);
create index if not exists leads_user_updated_at_idx on public.leads (user_id, updated_at desc);
create index if not exists leads_user_followup_idx on public.leads (user_id, proximo_followup)
  where proximo_followup is not null;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- TABELA: decisores
-- ----------------------------------------------------------------------------
create table if not exists public.decisores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  nome text not null,
  cargo text,
  telefone text,
  email text,
  instagram text,
  prioridade public.decisor_prioridade not null default 'd1',
  contatado boolean not null default false
);

comment on table public.decisores is 'Tomadores de decisão de cada lead. D1 = primário.';

create index if not exists decisores_user_idx on public.decisores (user_id);
create index if not exists decisores_lead_idx on public.decisores (lead_id);
create index if not exists decisores_lead_prioridade_idx on public.decisores (lead_id, prioridade);

drop trigger if exists trg_decisores_updated_at on public.decisores;
create trigger trg_decisores_updated_at
  before update on public.decisores
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- TABELA: interacoes (timeline de eventos do lead)
-- ----------------------------------------------------------------------------
-- Não tem updated_at — interações são append-only conceitualmente.
create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  decisor_id uuid references public.decisores(id) on delete set null,
  created_at timestamptz not null default now(),

  data_hora timestamptz not null,
  canal public.interacao_canal not null,
  tipo public.interacao_tipo not null,
  resumo text not null check (length(trim(resumo)) > 0)
);

comment on table public.interacoes is 'Timeline de mensagens/ligações/reuniões/notas registradas.';

create index if not exists interacoes_user_idx on public.interacoes (user_id);
create index if not exists interacoes_lead_data_idx on public.interacoes (lead_id, data_hora desc);
create index if not exists interacoes_decisor_idx on public.interacoes (decisor_id)
  where decisor_id is not null;

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security)
-- ----------------------------------------------------------------------------
-- Sistema é single-user, mas RLS é defesa em profundidade. Bloqueia o anon role
-- de ler/escrever qualquer coisa, e garante que cada user só vê seus dados.

alter table public.leads enable row level security;
alter table public.decisores enable row level security;
alter table public.interacoes enable row level security;

-- LEADS ----------------------------------------------------------------------
drop policy if exists "leads owner select" on public.leads;
create policy "leads owner select"
  on public.leads for select
  using (auth.uid() = user_id);

drop policy if exists "leads owner insert" on public.leads;
create policy "leads owner insert"
  on public.leads for insert
  with check (auth.uid() = user_id);

drop policy if exists "leads owner update" on public.leads;
create policy "leads owner update"
  on public.leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leads owner delete" on public.leads;
create policy "leads owner delete"
  on public.leads for delete
  using (auth.uid() = user_id);

-- DECISORES ------------------------------------------------------------------
drop policy if exists "decisores owner select" on public.decisores;
create policy "decisores owner select"
  on public.decisores for select
  using (auth.uid() = user_id);

drop policy if exists "decisores owner insert" on public.decisores;
create policy "decisores owner insert"
  on public.decisores for insert
  with check (auth.uid() = user_id);

drop policy if exists "decisores owner update" on public.decisores;
create policy "decisores owner update"
  on public.decisores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "decisores owner delete" on public.decisores;
create policy "decisores owner delete"
  on public.decisores for delete
  using (auth.uid() = user_id);

-- INTERACOES -----------------------------------------------------------------
drop policy if exists "interacoes owner select" on public.interacoes;
create policy "interacoes owner select"
  on public.interacoes for select
  using (auth.uid() = user_id);

drop policy if exists "interacoes owner insert" on public.interacoes;
create policy "interacoes owner insert"
  on public.interacoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "interacoes owner update" on public.interacoes;
create policy "interacoes owner update"
  on public.interacoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "interacoes owner delete" on public.interacoes;
create policy "interacoes owner delete"
  on public.interacoes for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- REALTIME publication (sync entre dispositivos do mesmo usuário)
-- ----------------------------------------------------------------------------
-- A publicação `supabase_realtime` já existe em todo projeto Supabase.
-- Aqui adicionamos nossas tabelas. As subscriptions client-side ainda passam
-- por RLS, então cada user só recebe eventos das próprias linhas.

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- leads
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
    ) then
      alter publication supabase_realtime add table public.leads;
    end if;
    -- decisores
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'decisores'
    ) then
      alter publication supabase_realtime add table public.decisores;
    end if;
    -- interacoes
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interacoes'
    ) then
      alter publication supabase_realtime add table public.interacoes;
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- FIM
-- ----------------------------------------------------------------------------
