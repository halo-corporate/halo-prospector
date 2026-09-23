-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013 — vendas geradas pelo código promocional do influencer
--
-- Tabela manual: Gabriel alimenta com as vendas que vieram via cupom do
-- influencer. Permite calcular KPIs de performance da parceria (faturado
-- total, ticket médio, qtd vendas).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.influencer_vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  influencer_id uuid not null references public.influencers(id) on delete cascade,

  data_venda date not null default (now() at time zone 'America/Sao_Paulo')::date,
  quantidade int not null default 1 check (quantidade > 0 and quantidade <= 999),
  valor_total numeric(12, 2) not null check (valor_total >= 0),
  comprador_nome text check (comprador_nome is null or length(comprador_nome) <= 200),
  observacoes text check (observacoes is null or length(observacoes) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.influencer_vendas is
  'Vendas geradas pelo código promocional do influencer. Input manual.';

create index if not exists infvendas_influencer_idx
  on public.influencer_vendas (influencer_id, data_venda desc);
create index if not exists infvendas_user_idx
  on public.influencer_vendas (user_id, data_venda desc);

drop trigger if exists trg_infvendas_updated_at on public.influencer_vendas;
create trigger trg_infvendas_updated_at
  before update on public.influencer_vendas
  for each row execute function public.set_updated_at();

alter table public.influencer_vendas enable row level security;

drop policy if exists "infvendas owner select" on public.influencer_vendas;
create policy "infvendas owner select" on public.influencer_vendas for select
  using (auth.uid() = user_id);

drop policy if exists "infvendas owner insert" on public.influencer_vendas;
create policy "infvendas owner insert" on public.influencer_vendas for insert
  with check (auth.uid() = user_id);

drop policy if exists "infvendas owner update" on public.influencer_vendas;
create policy "infvendas owner update" on public.influencer_vendas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "infvendas owner delete" on public.influencer_vendas;
create policy "infvendas owner delete" on public.influencer_vendas for delete
  using (auth.uid() = user_id);
