-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0016 — prioridade (3 níveis) + prazo em tarefas_semanais
--
-- V4 PR 3a. Evolui o checklist:
--   1. `prioridade text default 'media' check (prioridade in
--      ('alta','media','baixa'))` — substitui o `urgencia` binário por 3 níveis.
--      Migração de dados não-lossy: urgente → alta, nao_urgente → media.
--      Depois dropa a coluna `urgencia` e seu check.
--   2. `prazo timestamptz` (nullable) — deadline da tarefa, dirige o "glow de
--      proximidade" na UI (vencido / hoje / em breve / futuro).
--
-- Idempotente: IF NOT EXISTS / IF EXISTS / DO blocks.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) prioridade ----------------------------------------------------------------
alter table public.tarefas_semanais
  add column if not exists prioridade text not null default 'media';

-- Migra dados do urgencia (se a coluna ainda existir) antes do check/drop.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tarefas_semanais'
      and column_name = 'urgencia'
  ) then
    update public.tarefas_semanais
      set prioridade = case
        when urgencia = 'urgente' then 'alta'
        else 'media'
      end
      where prioridade = 'media'; -- só linhas ainda no default, evita sobrescrever
  end if;
end $$;

-- Check da prioridade (idempotente).
do $$
begin
  if not exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'tarefas_semanais'
      and constraint_name = 'tarefas_semanais_prioridade_check'
  ) then
    alter table public.tarefas_semanais
      add constraint tarefas_semanais_prioridade_check
      check (prioridade in ('alta', 'media', 'baixa'));
  end if;
end $$;

-- 2) prazo ---------------------------------------------------------------------
alter table public.tarefas_semanais
  add column if not exists prazo timestamptz;

-- 3) dropa urgencia (constraint + coluna) --------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'tarefas_semanais'
      and constraint_name = 'tarefas_semanais_urgencia_check'
  ) then
    alter table public.tarefas_semanais
      drop constraint tarefas_semanais_urgencia_check;
  end if;
end $$;

alter table public.tarefas_semanais
  drop column if exists urgencia;
