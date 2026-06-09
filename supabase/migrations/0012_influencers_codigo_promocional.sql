-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0012 — código promocional do influencer
--
-- Adiciona coluna `codigo_promocional` em `influencers`.
-- Cada influencer pode ter UM código (ex: "HALO10", "GABI20") que é usado pelos
-- seguidores na checkout. Armazenamos em UPPERCASE pra busca case-insensitive
-- e garantimos unicidade por user_id (mesmo dono não repete código).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.influencers
  add column if not exists codigo_promocional text
    check (codigo_promocional is null
           or (length(codigo_promocional) between 2 and 30
               and codigo_promocional ~ '^[A-Z0-9_-]+$'));

comment on column public.influencers.codigo_promocional is
  'Código promocional do influencer (uppercase, A-Z0-9_-). Único por user_id.';

-- Unicidade case-insensitive por user (índice parcial — ignora NULLs).
create unique index if not exists influencers_user_codigo_promocional_unique
  on public.influencers (user_id, codigo_promocional)
  where codigo_promocional is not null;
