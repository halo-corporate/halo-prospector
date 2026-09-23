-- 0022 — Valor declarado (seguro) do envio.
-- Aditivo: coluna numérica opcional usada como valor de seguro na geração da
-- etiqueta do Melhor Envio. Não quebra nada existente.

alter table public.envios
  add column if not exists valor_seguro numeric;
