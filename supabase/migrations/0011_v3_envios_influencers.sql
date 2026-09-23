-- ============================================================================
-- HALO Prospector — Migration 0011 — V3: Envios + Influencers
-- ============================================================================
-- Adiciona o módulo de pós-venda (envios + Melhor Envio) + área de influencer
-- marketing. Decisões travadas em 2026-06-08:
--
--   * embalagens: tabela própria, cadastro livre (mesmo padrão verticais),
--     com seed de 5 defaults.
--   * envios: pipeline a_despachar → embalado → etiquetado → postado →
--     em_transito → entregue → devolvido → extraviado. FKs opcionais pra
--     proposta + influencer + lead (origem variada). endereco_destino jsonb
--     porque user digita manual em cada envio (sem campos estruturados em
--     leads).
--   * influencers: tabela separada de leads. Status próprio. Suporta
--     contrato permuta, pago ou misto.
--   * influencer_pagamentos: tabela separada (histórico de parcelas/permutas).
--   * Bucket Storage privado `etiquetas` (PDFs Melhor Envio), mesma RLS por
--     pasta {user_id}/... que `comprovantes` usava na V2.
--
-- Integração Melhor Envio fica pra PR 3 — esta migration só prepara o schema.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'envio_status') then
    create type public.envio_status as enum (
      'a_despachar',
      'embalado',
      'etiquetado',
      'postado',
      'em_transito',
      'entregue',
      'devolvido',
      'extraviado'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'influencer_status') then
    create type public.influencer_status as enum (
      'prospeccao',
      'contatado',
      'negociando',
      'kit_enviado',
      'postou',
      'parceria_ativa',
      'encerrado'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'influencer_contrato_tipo') then
    create type public.influencer_contrato_tipo as enum (
      'permuta',
      'pago',
      'permuta_e_pago'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pagamento_tipo') then
    create type public.pagamento_tipo as enum ('permuta', 'pago');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type public.pagamento_status as enum (
      'pendente', 'pago', 'cancelado'
    );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA: embalagens
-- Cadastro livre por user (mesmo padrão verticais). Seed cobre defaults
-- típicos. Peso/dimensões padrão pra pré-preencher form de envio.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.embalagens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null check (length(trim(nome)) between 1 and 80),
  descricao text check (descricao is null or length(descricao) <= 500),
  ativo boolean not null default true,

  -- Padrões pra pré-preencher form de envio (opcionais)
  peso_g_padrao int check (peso_g_padrao is null or peso_g_padrao > 0),
  dimensoes_cm_padrao jsonb,  -- {altura, largura, comprimento}

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, nome)
);

comment on table public.embalagens is 'Tipos de embalagem cadastrados pelo user (caixa P/M/G, envelope, kit influencer, etc.) com peso/dimensões padrão.';

create index if not exists embalagens_user_ativo_idx
  on public.embalagens (user_id, ativo, nome);

drop trigger if exists trg_embalagens_updated_at on public.embalagens;
create trigger trg_embalagens_updated_at
  before update on public.embalagens
  for each row execute function public.set_updated_at();

alter table public.embalagens enable row level security;

drop policy if exists "embalagens owner select" on public.embalagens;
create policy "embalagens owner select" on public.embalagens for select
  using (auth.uid() = user_id);

drop policy if exists "embalagens owner insert" on public.embalagens;
create policy "embalagens owner insert" on public.embalagens for insert
  with check (auth.uid() = user_id);

drop policy if exists "embalagens owner update" on public.embalagens;
create policy "embalagens owner update" on public.embalagens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "embalagens owner delete" on public.embalagens;
create policy "embalagens owner delete" on public.embalagens for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA: influencers
-- Separada de leads. Suporta múltiplas redes sociais. Métricas de alcance
-- são input manual (sem API IG/TikTok — fora de escopo V3).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null check (length(trim(nome)) between 1 and 200),

  -- Handles (sem @ — armazena bruto, UI prepende)
  handle_instagram text check (handle_instagram is null or length(handle_instagram) <= 100),
  handle_tiktok text check (handle_tiktok is null or length(handle_tiktok) <= 100),
  handle_youtube text check (handle_youtube is null or length(handle_youtube) <= 100),

  -- Métricas (manual)
  seguidores_instagram int check (seguidores_instagram is null or seguidores_instagram >= 0),
  seguidores_tiktok int check (seguidores_tiktok is null or seguidores_tiktok >= 0),
  seguidores_youtube int check (seguidores_youtube is null or seguidores_youtube >= 0),
  engajamento_pct numeric(5, 2) check (engajamento_pct is null or (engajamento_pct >= 0 and engajamento_pct <= 100)),

  nicho text check (nicho is null or length(nicho) <= 100),  -- livre, sem enum
  cidade text check (cidade is null or length(cidade) <= 120),
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),

  status public.influencer_status not null default 'prospeccao',
  contrato_tipo public.influencer_contrato_tipo,
  valor_cache numeric(12, 2) check (valor_cache is null or valor_cache >= 0),

  posts_url text[] not null default '{}',  -- URLs publicadas
  alcance_total int check (alcance_total is null or alcance_total >= 0),
  engajamento_total int check (engajamento_total is null or engajamento_total >= 0),

  observacoes text check (observacoes is null or length(observacoes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.influencers is 'Influenciadores parceiros (separado de leads B2B). Métricas input manual.';

create index if not exists influencers_user_status_idx
  on public.influencers (user_id, status, nome);
create index if not exists influencers_user_created_idx
  on public.influencers (user_id, created_at desc);

drop trigger if exists trg_influencers_updated_at on public.influencers;
create trigger trg_influencers_updated_at
  before update on public.influencers
  for each row execute function public.set_updated_at();

alter table public.influencers enable row level security;

drop policy if exists "influencers owner select" on public.influencers;
create policy "influencers owner select" on public.influencers for select
  using (auth.uid() = user_id);

drop policy if exists "influencers owner insert" on public.influencers;
create policy "influencers owner insert" on public.influencers for insert
  with check (auth.uid() = user_id);

drop policy if exists "influencers owner update" on public.influencers;
create policy "influencers owner update" on public.influencers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "influencers owner delete" on public.influencers;
create policy "influencers owner delete" on public.influencers for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA: envios
-- Pipeline central de pós-venda. FKs opcionais (proposta/influencer/lead):
-- um envio pode vir de proposta convertida OU de envio de kit pra influencer.
-- Snapshot do endereço em jsonb porque user digita manual em cada envio.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Origem (todas opcionais; pelo menos uma deveria ter — não force, deixa flex)
  proposta_id uuid references public.propostas(id) on delete set null,
  influencer_id uuid references public.influencers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,

  -- Snapshot do destinatário — sobrevive a remoção do lead/influencer
  destinatario_nome text not null check (length(trim(destinatario_nome)) between 1 and 200),

  -- Endereço como JSON estruturado (digitado manual em cada envio)
  -- Schema esperado: {cep, rua, numero, complemento, bairro, cidade, uf}
  endereco_destino jsonb,

  embalagem_id uuid references public.embalagens(id) on delete set null,

  -- Peso e dimensões reais do envio (pode sobrescrever default da embalagem)
  peso_g int check (peso_g is null or peso_g > 0),
  dimensoes_cm jsonb,  -- {altura, largura, comprimento}

  status public.envio_status not null default 'a_despachar',

  -- Transportadora e rastreio
  transportadora text check (transportadora is null or length(transportadora) <= 80),
  servico text check (servico is null or length(servico) <= 80),  -- PAC, Sedex, .Package, etc.
  codigo_rastreio text check (codigo_rastreio is null or length(codigo_rastreio) <= 80),
  tracking_url text check (tracking_url is null or length(tracking_url) <= 1000),

  valor_frete numeric(12, 2) check (valor_frete is null or valor_frete >= 0),

  -- Integração Melhor Envio (preenchidos pelo PR 3)
  melhor_envio_order_id text check (melhor_envio_order_id is null or length(melhor_envio_order_id) <= 100),
  etiqueta_url text check (etiqueta_url is null or length(etiqueta_url) <= 1000),  -- caminho no bucket etiquetas/

  -- Datas
  data_postagem date,
  data_entrega_prevista date,
  data_entrega_efetiva date,

  observacoes text check (observacoes is null or length(observacoes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.envios is 'Pipeline de envios (pós-venda + kits influencer). Status manual ou via poll Melhor Envio.';

create index if not exists envios_user_status_idx
  on public.envios (user_id, status, created_at desc);
create index if not exists envios_user_created_idx
  on public.envios (user_id, created_at desc);
create index if not exists envios_proposta_idx on public.envios (proposta_id)
  where proposta_id is not null;
create index if not exists envios_influencer_idx on public.envios (influencer_id)
  where influencer_id is not null;
create index if not exists envios_lead_idx on public.envios (lead_id)
  where lead_id is not null;
create index if not exists envios_rastreio_idx on public.envios (codigo_rastreio)
  where codigo_rastreio is not null;

drop trigger if exists trg_envios_updated_at on public.envios;
create trigger trg_envios_updated_at
  before update on public.envios
  for each row execute function public.set_updated_at();

alter table public.envios enable row level security;

drop policy if exists "envios owner select" on public.envios;
create policy "envios owner select" on public.envios for select
  using (auth.uid() = user_id);

drop policy if exists "envios owner insert" on public.envios;
create policy "envios owner insert" on public.envios for insert
  with check (auth.uid() = user_id);

drop policy if exists "envios owner update" on public.envios;
create policy "envios owner update" on public.envios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "envios owner delete" on public.envios;
create policy "envios owner delete" on public.envios for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA: influencer_pagamentos
-- Histórico de parcelas/permutas pra cachê de influencer.
-- Permuta = produto (anel etc.) entregue como pagamento; valor pode ser 0.
-- Pago = R$ em dinheiro/Pix.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.influencer_pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  influencer_id uuid not null references public.influencers(id) on delete cascade,

  tipo public.pagamento_tipo not null,
  valor numeric(12, 2) not null default 0 check (valor >= 0),
  descricao_permuta text check (descricao_permuta is null or length(descricao_permuta) <= 500),

  data_combinada date not null default current_date,
  data_pago date,

  status public.pagamento_status not null default 'pendente',
  observacoes text check (observacoes is null or length(observacoes) <= 1000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Permuta exige descrição; pago exige valor > 0
  constraint pagamento_coerente check (
    (tipo = 'permuta' and descricao_permuta is not null and length(trim(descricao_permuta)) > 0)
    or
    (tipo = 'pago' and valor > 0)
  )
);

comment on table public.influencer_pagamentos is 'Pagamentos (permuta ou R$) pra cachê de influencer. Histórico de parcelas.';

create index if not exists infpag_influencer_idx
  on public.influencer_pagamentos (influencer_id, data_combinada desc);
create index if not exists infpag_user_status_idx
  on public.influencer_pagamentos (user_id, status, data_combinada desc);

drop trigger if exists trg_infpag_updated_at on public.influencer_pagamentos;
create trigger trg_infpag_updated_at
  before update on public.influencer_pagamentos
  for each row execute function public.set_updated_at();

alter table public.influencer_pagamentos enable row level security;

drop policy if exists "infpag owner select" on public.influencer_pagamentos;
create policy "infpag owner select" on public.influencer_pagamentos for select
  using (auth.uid() = user_id);

drop policy if exists "infpag owner insert" on public.influencer_pagamentos;
create policy "infpag owner insert" on public.influencer_pagamentos for insert
  with check (auth.uid() = user_id);

drop policy if exists "infpag owner update" on public.influencer_pagamentos;
create policy "infpag owner update" on public.influencer_pagamentos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "infpag owner delete" on public.influencer_pagamentos;
create policy "infpag owner delete" on public.influencer_pagamentos for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'embalagens'
    ) then
      alter publication supabase_realtime add table public.embalagens;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'influencers'
    ) then
      alter publication supabase_realtime add table public.influencers;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'envios'
    ) then
      alter publication supabase_realtime add table public.envios;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'influencer_pagamentos'
    ) then
      alter publication supabase_realtime add table public.influencer_pagamentos;
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: embalagens defaults (por user logado)
-- Inserido APENAS pro auth.uid() atual (single-user, então é o Gabriel).
-- Se rodar a migration de novo, ON CONFLICT garante idempotência.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise notice 'Sem auth.uid() — pula seed de embalagens. Rodar a migration logado no SQL Editor pra seedar.';
    return;
  end if;

  insert into public.embalagens (user_id, nome, descricao, peso_g_padrao, dimensoes_cm_padrao)
  values
    (uid, 'Caixa P', 'Caixa pequena — 1 anel', 80, '{"altura": 5, "largura": 10, "comprimento": 10}'::jsonb),
    (uid, 'Caixa M', 'Caixa média — 2-4 anéis', 150, '{"altura": 8, "largura": 15, "comprimento": 15}'::jsonb),
    (uid, 'Caixa G', 'Caixa grande — kit institucional', 300, '{"altura": 12, "largura": 20, "comprimento": 20}'::jsonb),
    (uid, 'Envelope', 'Envelope acolchoado — material impresso', 50, '{"altura": 1, "largura": 22, "comprimento": 30}'::jsonb),
    (uid, 'Kit Influencer', 'Caixa premium com brindes', 250, '{"altura": 10, "largura": 18, "comprimento": 18}'::jsonb)
  on conflict (user_id, nome) do nothing;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE: bucket `etiquetas` (privado)
-- Estrutura de pasta: etiquetas/{user_id}/{envio_id}-{rand}.pdf
-- RLS idêntica ao bucket `comprovantes` da V2 (folder = uid).
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('etiquetas', 'etiquetas', false)
on conflict (id) do nothing;

drop policy if exists "etiquetas user select" on storage.objects;
create policy "etiquetas user select"
  on storage.objects for select
  using (
    bucket_id = 'etiquetas'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "etiquetas user insert" on storage.objects;
create policy "etiquetas user insert"
  on storage.objects for insert
  with check (
    bucket_id = 'etiquetas'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "etiquetas user update" on storage.objects;
create policy "etiquetas user update"
  on storage.objects for update
  using (
    bucket_id = 'etiquetas'
    and (auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'etiquetas'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "etiquetas user delete" on storage.objects;
create policy "etiquetas user delete"
  on storage.objects for delete
  using (
    bucket_id = 'etiquetas'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- FIM 0011
-- Próximo passo (PR 2): tipos TS em database.types.ts + CRUD Embalagens + UI
-- básica de Envios (sem Melhor Envio ainda).
-- ============================================================================
