-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0016 — prioridade (3 níveis) + prazo em tarefas_semanais
--                   (EXPAND — fase aditiva, zero downtime)
--
-- V4 PR 3a. Evolui o checklist:
--   1. `prioridade text default 'media' check (prioridade in
--      ('alta','media','baixa'))` — substitui conceitualmente o `urgencia`
--      binário por 3 níveis. Migração de dados não-lossy:
--      urgente → alta, nao_urgente → media.
--   2. `prazo timestamptz` (nullable) — deadline da tarefa, dirige o "glow de
--      proximidade" na UI (vencido / hoje / em breve / futuro).
--
-- IMPORTANTE — expand/contract: esta migration NÃO dropa `urgencia`. Ela só
-- adiciona as colunas novas e copia os dados. Assim o código de produção atual
-- (que ainda lê `urgencia`) continua funcionando enquanto o preview do PR 3a
-- (que lê `prioridade`/`prazo`) também funciona. A coluna `urgencia` é dropada
-- na migration 0017, que roda DEPOIS do merge do PR 3a em main.
--
-- Idempotente: IF NOT EXISTS / IF EXISTS / DO blocks. Seguro re-rodar.
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

-- NOTA: `urgencia` é dropada na migration 0017 (após o merge do PR 3a).
