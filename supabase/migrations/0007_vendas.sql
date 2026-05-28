-- ============================================================================
-- HALO Prospector — Migration 0007 — Financeiro (vendas)
-- ============================================================================
-- Tabela de vendas com cálculos automáticos via generated columns:
--   valor_bruto = quantidade * valor_unitario
--   valor_liquido = valor_bruto - desconto
--   comissao_valor = valor_liquido * comissao_percentual / 100
-- Estes 3 campos são read-only via PostgREST (não envie em INSERT/UPDATE).
-- ============================================================================

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'venda_responsavel') then
    create type public.venda_responsavel as enum ('pedro', 'bessa', 'davi', 'gabriel');
  end if;
  if not exists (select 1 from pg_type where typname = 'venda_canal_pagamento') then
    create type public.venda_canal_pagamento as enum (
      'pix', 'cartao', 'boleto', 'transferencia', 'dinheiro', 'outro'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'venda_status') then
    create type public.venda_status as enum ('pendente', 'pago', 'parcial', 'cancelado');
  end if;
end $$;

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  data_venda date not null default current_date,
  cliente text not null check (length(trim(cliente)) between 1 and 200),
  -- Lead opcional (cliente pode não estar no CRM)
  lead_id uuid references public.leads(id) on delete set null,

  quantidade int not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null check (valor_unitario >= 0),
  desconto numeric(12, 2) not null default 0 check (desconto >= 0),

  -- Cálculos automáticos (read-only via PostgREST)
  valor_bruto numeric(12, 2)
    generated always as (quantidade * valor_unitario) stored,
  valor_liquido numeric(12, 2)
    generated always as ((quantidade * valor_unitario) - desconto) stored,

  responsavel public.venda_responsavel not null,
  comissao_percentual numeric(5, 2) not null default 10
    check (comissao_percentual >= 0 and comissao_percentual <= 100),
  comissao_valor numeric(12, 2)
    generated always as (
      ((quantidade * valor_unitario) - desconto) * comissao_percentual / 100
    ) stored,
  comissao_paga boolean not null default false,
  comissao_paga_em timestamptz,

  canal_pagamento public.venda_canal_pagamento,
  status public.venda_status not null default 'pendente',
  data_pagamento date,
  comprovante_url text,

  observacoes text check (observacoes is null or length(observacoes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vendas is 'Vendas (DRE). Cálculos automáticos via generated columns.';

create index if not exists vendas_user_data_idx
  on public.vendas (user_id, data_venda desc);
create index if not exists vendas_user_status_idx
  on public.vendas (user_id, status);
create index if not exists vendas_user_responsavel_idx
  on public.vendas (user_id, responsavel);
create index if not exists vendas_lead_idx on public.vendas (lead_id)
  where lead_id is not null;

drop trigger if exists trg_vendas_updated_at on public.vendas;
create trigger trg_vendas_updated_at
  before update on public.vendas
  for each row execute function public.set_updated_at();

alter table public.vendas enable row level security;

drop policy if exists "vendas owner select" on public.vendas;
create policy "vendas owner select" on public.vendas for select
  using (auth.uid() = user_id);

drop policy if exists "vendas owner insert" on public.vendas;
create policy "vendas owner insert" on public.vendas for insert
  with check (auth.uid() = user_id);

drop policy if exists "vendas owner update" on public.vendas;
create policy "vendas owner update" on public.vendas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "vendas owner delete" on public.vendas;
create policy "vendas owner delete" on public.vendas for delete
  using (auth.uid() = user_id);

-- Realtime
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vendas'
    ) then
      alter publication supabase_realtime add table public.vendas;
    end if;
  end if;
end $$;
