-- Migration: 0027_mensagens_templates_leitura_compartilhada.sql
-- Libera SELECT em mensagem_templates para qualquer usuário autenticado.
-- INSERT/UPDATE/DELETE continuam restritos ao owner (user_id = auth.uid()).
-- Enzo consegue ver os templates do Gabriel; Gabriel continua editando só os dele.

-- Remove a policy restritiva atual e substitui por duas:
-- 1. Leitura: qualquer auth.uid() — autenticado, não importando quem criou
-- 2. Escrita: só o dono

drop policy if exists "mensagens owner select" on public.mensagem_templates;
drop policy if exists "mensagens owner insert" on public.mensagem_templates;
drop policy if exists "mensagens owner update" on public.mensagem_templates;
drop policy if exists "mensagens owner delete" on public.mensagem_templates;

-- SELECT: qualquer usuário autenticado pode ler qualquer template
-- (mas só enxerga seus próprios via RLS no Realtime se não houver policy)
-- Na verdade: RLS está habilitada, então SEM policy o acesso é DENIED.
-- policy de SELECT precisa existir E permitir auth.uid() IS NOT NULL
create policy "mensagens leitura compartilhada" on public.mensagem_templates
  for select using (auth.uid() is not null);

-- INSERT: só cria na própria conta
create policy "mensagens owner insert" on public.mensagem_templates
  with check (auth.uid() = user_id);

-- UPDATE: só edita eigene
create policy "mensagens owner update" on public.mensagem_templates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: só apaga eigene
create policy "mensagens owner delete" on public.mensagem_templates
  for delete using (auth.uid() = user_id);
