-- ============================================================================
-- HALO Prospector — Migration 0003
-- ============================================================================
-- Adiciona coluna `observacoes` em tarefas_semanais para notas adicionais
-- por tarefa (revisão de dados, contexto, etc.). Nullable, max 1000 chars.
-- ============================================================================

alter table public.tarefas_semanais
  add column if not exists observacoes text
  check (observacoes is null or length(observacoes) <= 1000);
