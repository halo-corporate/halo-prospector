-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0014 — habilita realtime na tabela influencer_vendas
--
-- A migration 0013 criou a tabela mas não adicionou à publication
-- supabase_realtime, então os INSERT/UPDATE/DELETE não eram propagados
-- pra outras abas via Supabase Realtime. Este fix corrige isso.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'influencer_vendas'
    ) then
      alter publication supabase_realtime add table public.influencer_vendas;
    end if;
  end if;
end $$;
