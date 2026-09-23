-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0015 — stand_by + urgencia em tarefas_semanais
--
-- Adiciona dois campos ao checklist:
--   1. `stand_by boolean default false` — tarefa pausada (nem pendente "ativa"
--      nem concluída). Mutualmente exclusivo com `concluida` (guard via
--      trigger BEFORE UPDATE/INSERT: marcar um zera o outro).
--   2. `urgencia text default 'nao_urgente' check (urgencia in
--      ('urgente','nao_urgente'))` — etiqueta visual por tarefa.
--
-- Idempotente: usa IF NOT EXISTS / DO blocks.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tarefas_semanais
  add column if not exists stand_by boolean not null default false;

alter table public.tarefas_semanais
  add column if not exists urgencia text not null default 'nao_urgente';

do $$
begin
  if not exists (
    select 1
    from information_schema.constraint_column_usage
    where table_schema = 'public'
      and table_name = 'tarefas_semanais'
      and constraint_name = 'tarefas_semanais_urgencia_check'
  ) then
    alter table public.tarefas_semanais
      add constraint tarefas_semanais_urgencia_check
      check (urgencia in ('urgente', 'nao_urgente'));
  end if;
end $$;

-- Guard: stand_by e concluida são mutualmente exclusivos.
create or replace function public.tarefas_semanais_stand_by_concluida_guard()
returns trigger
language plpgsql
as $$
begin
  if new.stand_by and new.concluida then
    -- Última mudança vence; se ambos foram setados, mantém concluida e zera stand_by.
    if tg_op = 'UPDATE' and old.concluida is distinct from new.concluida and new.concluida then
      new.stand_by := false;
    elsif tg_op = 'UPDATE' and old.stand_by is distinct from new.stand_by and new.stand_by then
      new.concluida := false;
      new.concluida_em := null;
    else
      -- Insert ou ambos mudaram juntos: prioriza concluida.
      new.stand_by := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tarefas_stand_by_concluida_guard on public.tarefas_semanais;
create trigger trg_tarefas_stand_by_concluida_guard
  before insert or update on public.tarefas_semanais
  for each row execute function public.tarefas_semanais_stand_by_concluida_guard();
