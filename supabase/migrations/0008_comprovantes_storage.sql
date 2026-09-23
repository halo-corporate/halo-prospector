-- ============================================================================
-- HALO Prospector — Migration 0008 — Storage: comprovantes
-- ============================================================================
-- Cria bucket privado `comprovantes` no Supabase Storage e configura RLS
-- em storage.objects pra que cada usuário só consiga ler/escrever arquivos
-- dentro da sua própria pasta `{user_id}/...`.
--
-- Estrutura de pasta: comprovantes/{user_id}/{venda_id}-{rand}.{ext}
-- ============================================================================

-- Cria o bucket se não existir (private)
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

-- RLS policies em storage.objects pro bucket `comprovantes`.
-- storage.foldername(name) retorna um array de pastas — [1] é o primeiro
-- nível, onde armazenamos o auth.uid() do dono.

drop policy if exists "comprovantes user select" on storage.objects;
create policy "comprovantes user select"
  on storage.objects for select
  using (
    bucket_id = 'comprovantes'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "comprovantes user insert" on storage.objects;
create policy "comprovantes user insert"
  on storage.objects for insert
  with check (
    bucket_id = 'comprovantes'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "comprovantes user update" on storage.objects;
create policy "comprovantes user update"
  on storage.objects for update
  using (
    bucket_id = 'comprovantes'
    and (auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'comprovantes'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "comprovantes user delete" on storage.objects;
create policy "comprovantes user delete"
  on storage.objects for delete
  using (
    bucket_id = 'comprovantes'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
