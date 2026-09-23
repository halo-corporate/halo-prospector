-- ============================================================================
-- HALO Prospector — Migration 0010 — Multi-select fields
-- ============================================================================
-- Permite selecionar mais de um valor nos campos que faziam sentido como
-- multi. Estratégia: ADD nova coluna array, COPY dados do antigo escalar,
-- DEIXA o antigo no banco por enquanto (safety). Pode dropar em migration
-- futura quando confirmado que tudo funciona.
--
-- Colunas convertidas:
--   mensagem_templates.canal (mensagem_canal)        → canais (mensagem_canal[])
--   mensagem_templates.etapa_funil (text)            → etapas_funil (text[])
--   leads.vertical (text)                            → verticais (text[])
--   informacoes.categoria (text)                     → categorias (text[])
-- ============================================================================

-- 1. mensagem_templates: canal → canais
alter table public.mensagem_templates
  add column if not exists canais public.mensagem_canal[]
  not null
  default array['whatsapp']::public.mensagem_canal[];

update public.mensagem_templates
   set canais = array[canal]::public.mensagem_canal[]
 where canal is not null
   and canais = array['whatsapp']::public.mensagem_canal[];

-- 2. mensagem_templates: etapa_funil → etapas_funil (nullable, sem default)
alter table public.mensagem_templates
  add column if not exists etapas_funil text[];

update public.mensagem_templates
   set etapas_funil = array[etapa_funil]
 where etapas_funil is null
   and etapa_funil is not null;

-- 3. leads: vertical → verticais
alter table public.leads
  add column if not exists verticais text[]
  not null
  default array[]::text[];

update public.leads
   set verticais = array[vertical]
 where vertical is not null
   and verticais = array[]::text[];

-- 4. informacoes: categoria → categorias
alter table public.informacoes
  add column if not exists categorias text[]
  not null
  default array[]::text[];

update public.informacoes
   set categorias = array[categoria]
 where categoria is not null
   and categorias = array[]::text[];

-- Index GIN nas colunas array pra acelerar queries com .contains() e .overlaps()
create index if not exists mensagem_templates_canais_gin_idx
  on public.mensagem_templates using gin (canais);
create index if not exists mensagem_templates_etapas_gin_idx
  on public.mensagem_templates using gin (etapas_funil);
create index if not exists leads_verticais_gin_idx
  on public.leads using gin (verticais);
create index if not exists informacoes_categorias_gin_idx
  on public.informacoes using gin (categorias);
