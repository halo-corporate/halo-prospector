-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0021 — dados do remetente (expedidor) do Melhor Envio
--
-- V4 PR 4c-i (etiqueta, fatia 1 = config do remetente). O checkout do Melhor
-- Envio (POST /me/cart) exige a identidade completa de QUEM ENVIA: nome/razão,
-- documento (CPF ou CNPJ), telefone, e-mail e endereço completo. Guardamos isso
-- aqui, 1 linha por usuário (PK = user_id), pra reusar em todo envio sem
-- redigitar. A fatia 4c-ii (comprar/gerar etiqueta) lê estes dados.
--
-- Não há segredos aqui (é a identidade comercial do próprio usuário), mas
-- mantemos RLS owner-scoped por consistência e isolamento.
--
-- Idempotente / aditiva (expand) — segura em prod compartilhado.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.melhor_envio_remetente (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,

  nome text not null,
  -- CPF (11) ou CNPJ (14) — guardado só com dígitos.
  documento text not null,
  telefone text,
  email text,

  cep text not null,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.melhor_envio_remetente is 'Dados do remetente (expedidor) p/ etiquetas do Melhor Envio (owner-scoped, 1 linha por usuário).';

drop trigger if exists trg_melhor_envio_remetente_updated_at on public.melhor_envio_remetente;
create trigger trg_melhor_envio_remetente_updated_at
  before update on public.melhor_envio_remetente
  for each row execute function public.set_updated_at();

alter table public.melhor_envio_remetente enable row level security;

drop policy if exists "me_remetente owner select" on public.melhor_envio_remetente;
create policy "me_remetente owner select"
  on public.melhor_envio_remetente for select
  using (auth.uid() = user_id);

drop policy if exists "me_remetente owner insert" on public.melhor_envio_remetente;
create policy "me_remetente owner insert"
  on public.melhor_envio_remetente for insert
  with check (auth.uid() = user_id);

drop policy if exists "me_remetente owner update" on public.melhor_envio_remetente;
create policy "me_remetente owner update"
  on public.melhor_envio_remetente for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "me_remetente owner delete" on public.melhor_envio_remetente;
create policy "me_remetente owner delete"
  on public.melhor_envio_remetente for delete
  using (auth.uid() = user_id);
