-- ============================================================================
-- HALO Prospector — Migration 0009 — Propostas
-- ============================================================================
-- Propostas comerciais enviadas a clientes (potenciais leads ou existentes).
-- Quando o cliente aceita, o user converte a proposta em venda (lança no
-- Financeiro) com 1 clique. Mantém vínculo bidirecional: propostas.venda_id
-- aponta pra venda criada; vendas continuam independentes (pode ter venda
-- sem proposta).
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'proposta_status') then
    create type public.proposta_status as enum (
      'aberto', 'negociacao', 'recusado', 'convertido'
    );
  end if;
end $$;

create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Vínculo opcional ao lead (proposta pode existir sem CRM, mas ideal ter)
  lead_id uuid references public.leads(id) on delete set null,
  -- Snapshot do cliente — sobrevive a remoção do lead
  cliente text not null check (length(trim(cliente)) between 1 and 200),

  titulo text not null check (length(trim(titulo)) between 1 and 200),
  descricao text check (descricao is null or length(descricao) <= 4000),

  quantidade int not null default 1 check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  valor_total numeric(12, 2) generated always as (quantidade * valor_unitario) stored,

  status public.proposta_status not null default 'aberto',
  data_envio date not null default current_date,
  data_resposta date,
  motivo_recusa text check (motivo_recusa is null or length(motivo_recusa) <= 1000),

  -- Linkada quando status='convertido' via ação "Converter em venda"
  venda_id uuid references public.vendas(id) on delete set null,

  observacoes text check (observacoes is null or length(observacoes) <= 2000),
  ordem int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.propostas is 'Propostas comerciais com fluxo aberto → negociacao → convertido/recusado.';

create index if not exists propostas_user_data_idx
  on public.propostas (user_id, data_envio desc);
create index if not exists propostas_user_status_idx
  on public.propostas (user_id, status, data_envio desc);
create index if not exists propostas_lead_idx on public.propostas (lead_id)
  where lead_id is not null;
create index if not exists propostas_venda_idx on public.propostas (venda_id)
  where venda_id is not null;

drop trigger if exists trg_propostas_updated_at on public.propostas;
create trigger trg_propostas_updated_at
  before update on public.propostas
  for each row execute function public.set_updated_at();

alter table public.propostas enable row level security;

drop policy if exists "propostas owner select" on public.propostas;
create policy "propostas owner select" on public.propostas for select
  using (auth.uid() = user_id);

drop policy if exists "propostas owner insert" on public.propostas;
create policy "propostas owner insert" on public.propostas for insert
  with check (auth.uid() = user_id);

drop policy if exists "propostas owner update" on public.propostas;
create policy "propostas owner update" on public.propostas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "propostas owner delete" on public.propostas;
create policy "propostas owner delete" on public.propostas for delete
  using (auth.uid() = user_id);

-- Realtime
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'propostas'
    ) then
      alter publication supabase_realtime add table public.propostas;
    end if;
  end if;
end $$;

-- Atualiza o RealtimeRefresher do app pra incluir esta tabela (manual,
-- arquivo TS — código fonte do projeto).
