-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0019 — subtarefas (checklist aninhado, 1 nível)
--
-- V4 PR 3c. Uma tarefa pode ter subtarefas. Modelado como auto-referência:
--   `tarefas_semanais.parent_id uuid` aponta pra tarefa-pai.
--   `on delete cascade`: apagar a pai apaga as subtarefas junto.
-- Aninhamento de 1 nível só (subtarefa não tem subtarefa) — garantido pela
-- aplicação (só oferece "+ subtarefa" em tarefas top-level).
--
-- Idempotente: IF NOT EXISTS. Aditiva (expand) — segura em prod compartilhado.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tarefas_semanais
  add column if not exists parent_id uuid
    references public.tarefas_semanais(id) on delete cascade;

create index if not exists tarefas_semanais_parent_idx
  on public.tarefas_semanais (parent_id);
