-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0017 — dropa `urgencia` de tarefas_semanais (CONTRACT)
--
-- V4 PR 3a, fase de contração do expand/contract. Roda SOMENTE DEPOIS que o
-- PR 3a estiver mergeado em main e em produção — nesse ponto nenhum código
-- referencia mais `urgencia`, então é seguro remover a coluna.
--
-- Pré-requisito: migration 0016 já rodou (prioridade preenchida a partir de
-- urgencia). Esta migration apenas remove a coluna antiga e seu check.
--
-- Idempotente: IF EXISTS / DO blocks. Seguro re-rodar.
-- ─────────────────────────────────────────────────────────────────────────────

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
