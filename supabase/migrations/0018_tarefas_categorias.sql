-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0018 — categorias configuráveis para o checklist semanal
--
-- V4 PR 3b. Permite agrupar tarefas por categoria definida pelo usuário.
--   1. Tabela `categorias_tarefa` (owner-scoped via RLS): nome, cor (hex pra
--      o brilho/realce visual), ordem (posição na lista) e timestamps.
--   2. `tarefas_semanais.categoria_id uuid` (nullable) — FK pra categoria.
--      `on delete set null`: apagar a categoria NÃO apaga as tarefas, só as
--      desagrupa (voltam pra "Sem categoria").
--
-- Idempotente: IF NOT EXISTS / DO blocks. Seguro re-rodar.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tabela categorias_tarefa --------------------------------------------------
create table if not exists public.categorias_tarefa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null check (length(trim(nome)) between 1 and 40),
  -- Cor em hex (#RRGGBB). Default = HALO blue. Dirige o realce visual do grupo.
  cor text not null default '#0071E3' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.categorias_tarefa is 'Categorias configuráveis do checklist semanal (owner-scoped).';

create index if not exists categorias_tarefa_user_ordem_idx
  on public.categorias_tarefa (user_id, ordem, created_at);

drop trigger if exists trg_categorias_tarefa_updated_at on public.categorias_tarefa;
create trigger trg_categorias_tarefa_updated_at
  before update on public.categorias_tarefa
  for each row execute function public.set_updated_at();

alter table public.categorias_tarefa enable row level security;

drop policy if exists "categorias owner select" on public.categorias_tarefa;
create policy "categorias owner select"
  on public.categorias_tarefa for select
  using (auth.uid() = user_id);

drop policy if exists "categorias owner insert" on public.categorias_tarefa;
create policy "categorias owner insert"
  on public.categorias_tarefa for insert
  with check (auth.uid() = user_id);

drop policy if exists "categorias owner update" on public.categorias_tarefa;
create policy "categorias owner update"
  on public.categorias_tarefa for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "categorias owner delete" on public.categorias_tarefa;
create policy "categorias owner delete"
  on public.categorias_tarefa for delete
  using (auth.uid() = user_id);

-- 2) categoria_id em tarefas_semanais ------------------------------------------
alter table public.tarefas_semanais
  add column if not exists categoria_id uuid
    references public.categorias_tarefa(id) on delete set null;

create index if not exists tarefas_semanais_categoria_idx
  on public.tarefas_semanais (categoria_id);
