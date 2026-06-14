-- Dados de contato/identidade do destinatário, usados na etiqueta do Melhor
-- Envio (campos document/email/phone do `to`). Todos opcionais.
alter table public.envios
  add column if not exists destinatario_documento text,
  add column if not exists destinatario_email text,
  add column if not exists destinatario_telefone text;
