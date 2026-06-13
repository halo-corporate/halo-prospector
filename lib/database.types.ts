/**
 * Types do banco — espelham `supabase/migrations/*.sql`.
 *
 * Mantidos à mão (não geramos via `supabase gen types` na V1 para evitar
 * dependência da CLI). Se o schema mudar, atualizar AQUI E NO SQL juntos.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums (Postgres enums e tipos restritos via convenção)
// ---------------------------------------------------------------------------

// `vertical` agora é text livre (registro em `verticais`); estes 5 slugs
// continuam sendo os defaults seedados.
export const DEFAULT_VERTICAL_SLUGS = [
  "clinicas_medicas",
  "academias",
  "wellness",
  "corporativo",
  "turismo_sono",
] as const;
export type DefaultVerticalSlug = (typeof DEFAULT_VERTICAL_SLUGS)[number];

export type LeadStatus =
  | "novo"
  | "pesquisando"
  | "tentativa_contato"
  | "em_qualificacao"
  | "aquecido"
  | "passado_closer"
  | "ganho"
  | "perdido"
  | "descartado";

export type LeadTemperatura = "frio" | "morno" | "quente";

export type TarefaPrioridade = "alta" | "media" | "baixa";

export type DecisorPrioridade = "d1" | "d2" | "d3";

export type InteracaoCanal =
  | "whatsapp"
  | "instagram"
  | "email"
  | "telefone"
  | "presencial"
  | "outro";

export type InteracaoTipo =
  | "envio_mensagem"
  | "resposta_recebida"
  | "ligacao_atendida"
  | "ligacao_nao_atendida"
  | "reuniao"
  | "nota_interna";

export type MensagemCanal =
  | "whatsapp"
  | "email"
  | "instagram"
  | "sms"
  | "outro";

export type VendaResponsavel = "pedro" | "bessa" | "davi" | "gabriel";

export type VendaCanalPagamento =
  | "pix"
  | "cartao"
  | "boleto"
  | "transferencia"
  | "dinheiro"
  | "outro";

export type VendaStatus = "pendente" | "pago" | "parcial" | "cancelado";

export type PropostaStatus =
  | "aberto"
  | "negociacao"
  | "recusado"
  | "convertido";

// ---------------------------------------------------------------------------
// Listas pra renderizar selects / labels em PT-BR
// ---------------------------------------------------------------------------

/**
 * Labels dos 5 slugs default. Usado como fallback quando renderizamos um
 * slug sem ter a lista de verticais do banco em mãos. A fonte canônica
 * dos labels é a tabela `verticais`.
 */
export const DEFAULT_VERTICAL_LABELS: Record<DefaultVerticalSlug, string> = {
  clinicas_medicas: "Clínicas Médicas",
  academias: "Academias & Studios",
  wellness: "Wellness",
  corporativo: "Corporativo (Tech)",
  turismo_sono: "Turismo do Sono",
};

/**
 * Lê os verticais de um lead com fallback pro escalar legado. Garante array
 * não-vazio quando o lead tem ao menos `vertical` setado.
 */
export function readLeadVerticais(lead: {
  verticais?: string[] | null;
  vertical?: string | null;
}): string[] {
  if (Array.isArray(lead.verticais) && lead.verticais.length > 0) {
    return lead.verticais;
  }
  return lead.vertical ? [lead.vertical] : [];
}

/**
 * Resolve um slug pra label legível. Se a lista de verticais for fornecida,
 * usa ela; senão usa o map de defaults; senão devolve o próprio slug.
 */
export function verticalLabel(
  slug: string,
  verticais?: { slug: string; label: string }[],
): string {
  if (verticais) {
    const v = verticais.find((x) => x.slug === slug);
    if (v) return v.label;
  }
  if (slug in DEFAULT_VERTICAL_LABELS) {
    return DEFAULT_VERTICAL_LABELS[slug as DefaultVerticalSlug];
  }
  return slug;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  pesquisando: "Pesquisando",
  tentativa_contato: "Tentativa de contato",
  em_qualificacao: "Em qualificação",
  aquecido: "Aquecido",
  passado_closer: "Passado ao closer",
  ganho: "Ganho",
  perdido: "Perdido",
  descartado: "Descartado",
};

export const LEAD_TEMPERATURA_LABELS: Record<LeadTemperatura, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

export const TAREFA_PRIORIDADE_LABELS: Record<TarefaPrioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/** Ordem de ciclo ao clicar no chip de prioridade: alta → média → baixa → alta. */
export const TAREFA_PRIORIDADE_CICLO: TarefaPrioridade[] = [
  "alta",
  "media",
  "baixa",
];

export const DECISOR_PRIORIDADE_LABELS: Record<DecisorPrioridade, string> = {
  d1: "D1 (primário)",
  d2: "D2",
  d3: "D3",
};

export const INTERACAO_CANAL_LABELS: Record<InteracaoCanal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  telefone: "Telefone",
  presencial: "Presencial",
  outro: "Outro",
};

export const INTERACAO_TIPO_LABELS: Record<InteracaoTipo, string> = {
  envio_mensagem: "Envio de mensagem",
  resposta_recebida: "Resposta recebida",
  ligacao_atendida: "Ligação atendida",
  ligacao_nao_atendida: "Ligação não atendida",
  reuniao: "Reunião",
  nota_interna: "Nota interna",
};

export const MENSAGEM_CANAIS: MensagemCanal[] = [
  "whatsapp",
  "email",
  "instagram",
  "sms",
  "outro",
];

export const MENSAGEM_CANAL_LABELS: Record<MensagemCanal, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  sms: "SMS",
  outro: "Outro",
};

export const VENDA_RESPONSAVEIS: VendaResponsavel[] = [
  "pedro",
  "bessa",
  "davi",
  "gabriel",
];
export const VENDA_RESPONSAVEL_LABELS: Record<VendaResponsavel, string> = {
  pedro: "Pedro",
  bessa: "Bessa",
  davi: "Davi",
  gabriel: "Gabriel",
};

export const VENDA_CANAIS_PAGAMENTO: VendaCanalPagamento[] = [
  "pix",
  "cartao",
  "boleto",
  "transferencia",
  "dinheiro",
  "outro",
];
export const VENDA_CANAL_PAGAMENTO_LABELS: Record<VendaCanalPagamento, string> = {
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

export const VENDA_STATUSES: VendaStatus[] = [
  "pendente",
  "pago",
  "parcial",
  "cancelado",
];
export const VENDA_STATUS_LABELS: Record<VendaStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  parcial: "Parcial",
  cancelado: "Cancelado",
};

export const PROPOSTA_STATUSES: PropostaStatus[] = [
  "aberto",
  "negociacao",
  "recusado",
  "convertido",
];
export const PROPOSTA_STATUS_LABELS: Record<PropostaStatus, string> = {
  aberto: "Aberto",
  negociacao: "Negociação",
  recusado: "Recusado",
  convertido: "Convertido",
};

// ---------------------------------------------------------------------------
// V3 — Envios + Influencers
// ---------------------------------------------------------------------------

export type EnvioStatus =
  | "a_despachar"
  | "embalado"
  | "etiquetado"
  | "postado"
  | "em_transito"
  | "entregue"
  | "devolvido"
  | "extraviado";

export const ENVIO_STATUSES: EnvioStatus[] = [
  "a_despachar",
  "embalado",
  "etiquetado",
  "postado",
  "em_transito",
  "entregue",
  "devolvido",
  "extraviado",
];

export const ENVIO_STATUS_LABELS: Record<EnvioStatus, string> = {
  a_despachar: "A despachar",
  embalado: "Embalado",
  etiquetado: "Etiquetado",
  postado: "Postado",
  em_transito: "Em trânsito",
  entregue: "Entregue",
  devolvido: "Devolvido",
  extraviado: "Extraviado",
};

/** Endereço estruturado armazenado em jsonb. Todos opcionais — UI valida CEP. */
export interface EnderecoDestino {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

/** Dimensões em cm pra cotação de frete. */
export interface DimensoesCm {
  altura?: number | null;
  largura?: number | null;
  comprimento?: number | null;
}

export type InfluencerStatus =
  | "prospeccao"
  | "contatado"
  | "negociando"
  | "kit_enviado"
  | "postou"
  | "parceria_ativa"
  | "encerrado";

export type InfluencerContratoTipo =
  | "permuta"
  | "pago"
  | "permuta_e_pago";

export type PagamentoTipo = "permuta" | "pago";
export type PagamentoStatus = "pendente" | "pago" | "cancelado";

export const INFLUENCER_STATUSES: InfluencerStatus[] = [
  "prospeccao",
  "contatado",
  "negociando",
  "kit_enviado",
  "postou",
  "parceria_ativa",
  "encerrado",
];

export const INFLUENCER_STATUS_LABELS: Record<InfluencerStatus, string> = {
  prospeccao: "Prospecção",
  contatado: "Contatado",
  negociando: "Negociando",
  kit_enviado: "Kit enviado",
  postou: "Postou",
  parceria_ativa: "Parceria ativa",
  encerrado: "Encerrado",
};

export const INFLUENCER_CONTRATO_TIPOS: InfluencerContratoTipo[] = [
  "permuta",
  "pago",
  "permuta_e_pago",
];

export const INFLUENCER_CONTRATO_TIPO_LABELS: Record<
  InfluencerContratoTipo,
  string
> = {
  permuta: "Permuta",
  pago: "Pago (R$)",
  permuta_e_pago: "Permuta + R$",
};

export const PAGAMENTO_TIPOS: PagamentoTipo[] = ["permuta", "pago"];

export const PAGAMENTO_TIPO_LABELS: Record<PagamentoTipo, string> = {
  permuta: "Permuta",
  pago: "Pago (R$)",
};

export const PAGAMENTO_STATUSES: PagamentoStatus[] = [
  "pendente",
  "pago",
  "cancelado",
];

export const PAGAMENTO_STATUS_LABELS: Record<PagamentoStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

// ---------------------------------------------------------------------------
// Database interface (formato compatível com `Database` do supabase-js)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      leads: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          empresa: string;
          /** @deprecated use `verticais` (multi). Mantido até migration 0011. */
          vertical: string;
          verticais: string[];
          cidade: string | null;
          estado: string | null;
          bairro_regiao: string | null;
          sub_nicho: string | null;
          site: string | null;
          instagram: string | null;
          telefone: string | null;
          email: string | null;
          ticket_estimado: number | null;
          status: LeadStatus;
          temperatura: LeadTemperatura | null;
          proximo_passo: string | null;
          proximo_followup: string | null;
          motivo_perda: string | null;
          observacoes: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          empresa: string;
          vertical: string;
          verticais?: string[];
          cidade?: string | null;
          estado?: string | null;
          bairro_regiao?: string | null;
          sub_nicho?: string | null;
          site?: string | null;
          instagram?: string | null;
          telefone?: string | null;
          email?: string | null;
          ticket_estimado?: number | null;
          status?: LeadStatus;
          temperatura?: LeadTemperatura | null;
          proximo_passo?: string | null;
          proximo_followup?: string | null;
          motivo_perda?: string | null;
          observacoes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          empresa?: string;
          vertical?: string;
          verticais?: string[];
          cidade?: string | null;
          estado?: string | null;
          bairro_regiao?: string | null;
          sub_nicho?: string | null;
          site?: string | null;
          instagram?: string | null;
          telefone?: string | null;
          email?: string | null;
          ticket_estimado?: number | null;
          status?: LeadStatus;
          temperatura?: LeadTemperatura | null;
          proximo_passo?: string | null;
          proximo_followup?: string | null;
          motivo_perda?: string | null;
          observacoes?: string | null;
        };
      };
      decisores: {
        Relationships: [
          {
            foreignKeyName: "decisores_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          lead_id: string;
          created_at: string;
          updated_at: string;
          nome: string;
          cargo: string | null;
          telefone: string | null;
          email: string | null;
          instagram: string | null;
          prioridade: DecisorPrioridade;
          contatado: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lead_id: string;
          created_at?: string;
          updated_at?: string;
          nome: string;
          cargo?: string | null;
          telefone?: string | null;
          email?: string | null;
          instagram?: string | null;
          prioridade?: DecisorPrioridade;
          contatado?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string;
          created_at?: string;
          updated_at?: string;
          nome?: string;
          cargo?: string | null;
          telefone?: string | null;
          email?: string | null;
          instagram?: string | null;
          prioridade?: DecisorPrioridade;
          contatado?: boolean;
        };
      };
      interacoes: {
        Relationships: [
          {
            foreignKeyName: "interacoes_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interacoes_decisor_id_fkey";
            columns: ["decisor_id"];
            referencedRelation: "decisores";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          lead_id: string;
          decisor_id: string | null;
          created_at: string;
          data_hora: string;
          canal: InteracaoCanal;
          tipo: InteracaoTipo;
          resumo: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lead_id: string;
          decisor_id?: string | null;
          created_at?: string;
          data_hora: string;
          canal: InteracaoCanal;
          tipo: InteracaoTipo;
          resumo: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string;
          decisor_id?: string | null;
          created_at?: string;
          data_hora?: string;
          canal?: InteracaoCanal;
          tipo?: InteracaoTipo;
          resumo?: string;
        };
      };
      verticais: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          slug: string;
          label: string;
          is_default: boolean;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          slug: string;
          label: string;
          is_default?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slug?: string;
          label?: string;
          is_default?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      propostas: {
        Relationships: [
          {
            foreignKeyName: "propostas_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "propostas_venda_id_fkey";
            columns: ["venda_id"];
            referencedRelation: "vendas";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          lead_id: string | null;
          cliente: string;
          titulo: string;
          descricao: string | null;
          quantidade: number;
          valor_unitario: number;
          valor_total: number; // generated
          status: PropostaStatus;
          data_envio: string;
          data_resposta: string | null;
          motivo_recusa: string | null;
          venda_id: string | null;
          observacoes: string | null;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          cliente: string;
          titulo: string;
          descricao?: string | null;
          quantidade?: number;
          valor_unitario: number;
          status?: PropostaStatus;
          data_envio?: string;
          data_resposta?: string | null;
          motivo_recusa?: string | null;
          venda_id?: string | null;
          observacoes?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          cliente?: string;
          titulo?: string;
          descricao?: string | null;
          quantidade?: number;
          valor_unitario?: number;
          status?: PropostaStatus;
          data_envio?: string;
          data_resposta?: string | null;
          motivo_recusa?: string | null;
          venda_id?: string | null;
          observacoes?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendas: {
        Relationships: [
          {
            foreignKeyName: "vendas_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          data_venda: string;
          cliente: string;
          lead_id: string | null;
          quantidade: number;
          valor_unitario: number;
          desconto: number;
          valor_bruto: number;
          valor_liquido: number;
          responsavel: VendaResponsavel;
          comissao_percentual: number;
          comissao_valor: number;
          comissao_paga: boolean;
          comissao_paga_em: string | null;
          canal_pagamento: VendaCanalPagamento | null;
          status: VendaStatus;
          data_pagamento: string | null;
          comprovante_url: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          data_venda?: string;
          cliente: string;
          lead_id?: string | null;
          quantidade: number;
          valor_unitario: number;
          desconto?: number;
          responsavel: VendaResponsavel;
          comissao_percentual?: number;
          comissao_paga?: boolean;
          comissao_paga_em?: string | null;
          canal_pagamento?: VendaCanalPagamento | null;
          status?: VendaStatus;
          data_pagamento?: string | null;
          comprovante_url?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data_venda?: string;
          cliente?: string;
          lead_id?: string | null;
          quantidade?: number;
          valor_unitario?: number;
          desconto?: number;
          responsavel?: VendaResponsavel;
          comissao_percentual?: number;
          comissao_paga?: boolean;
          comissao_paga_em?: string | null;
          canal_pagamento?: VendaCanalPagamento | null;
          status?: VendaStatus;
          data_pagamento?: string | null;
          comprovante_url?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      informacoes: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          /** @deprecated use `categorias` (multi). Mantido até migration 0011. */
          categoria: string;
          categorias: string[];
          titulo: string;
          valor: string;
          valor_secreto: string | null;
          observacoes: string | null;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          categoria: string;
          categorias?: string[];
          titulo: string;
          valor: string;
          valor_secreto?: string | null;
          observacoes?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          categoria?: string;
          categorias?: string[];
          titulo?: string;
          valor?: string;
          valor_secreto?: string | null;
          observacoes?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      mensagem_templates: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          /** @deprecated use `canais` (multi). Mantido até migration 0011. */
          canal: MensagemCanal;
          canais: MensagemCanal[];
          /** @deprecated use `etapas_funil` (multi). Mantido até migration 0011. */
          etapa_funil: string | null;
          etapas_funil: string[] | null;
          assunto: string | null;
          corpo: string;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          titulo: string;
          canal?: MensagemCanal;
          canais?: MensagemCanal[];
          etapa_funil?: string | null;
          etapas_funil?: string[] | null;
          assunto?: string | null;
          corpo: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          canal?: MensagemCanal;
          canais?: MensagemCanal[];
          etapa_funil?: string | null;
          etapas_funil?: string[] | null;
          assunto?: string | null;
          corpo?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      links: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          titulo: string;
          url: string;
          descricao: string | null;
          tipo: string;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          titulo: string;
          url: string;
          descricao?: string | null;
          tipo?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          titulo?: string;
          url?: string;
          descricao?: string | null;
          tipo?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tarefas_semanais: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          semana: string; // ISO date (yyyy-MM-dd)
          texto: string;
          observacoes: string | null;
          concluida: boolean;
          concluida_em: string | null;
          stand_by: boolean;
          prioridade: TarefaPrioridade;
          prazo: string | null; // timestamptz ISO
          categoria_id: string | null;
          parent_id: string | null;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          semana: string;
          texto: string;
          observacoes?: string | null;
          concluida?: boolean;
          concluida_em?: string | null;
          stand_by?: boolean;
          prioridade?: TarefaPrioridade;
          prazo?: string | null;
          categoria_id?: string | null;
          parent_id?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          semana?: string;
          texto?: string;
          observacoes?: string | null;
          concluida?: boolean;
          concluida_em?: string | null;
          stand_by?: boolean;
          prioridade?: TarefaPrioridade;
          prazo?: string | null;
          categoria_id?: string | null;
          parent_id?: string | null;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      melhor_envio_conexao: {
        Relationships: [];
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_type: string;
          scope: string | null;
          ambiente: "sandbox" | "production";
          expires_at: string;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          access_token: string;
          refresh_token: string;
          token_type?: string;
          scope?: string | null;
          ambiente?: "sandbox" | "production";
          expires_at: string;
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_type?: string;
          scope?: string | null;
          ambiente?: "sandbox" | "production";
          expires_at?: string;
          connected_at?: string;
          updated_at?: string;
        };
      };
      melhor_envio_remetente: {
        Relationships: [];
        Row: {
          user_id: string;
          nome: string;
          documento: string;
          telefone: string | null;
          email: string | null;
          cep: string;
          rua: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          uf: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          nome: string;
          documento: string;
          telefone?: string | null;
          email?: string | null;
          cep: string;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          nome?: string;
          documento?: string;
          telefone?: string | null;
          email?: string | null;
          cep?: string;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categorias_tarefa: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          nome: string;
          cor: string; // hex #RRGGBB
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          nome: string;
          cor?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          cor?: string;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      embalagens: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          nome: string;
          descricao: string | null;
          ativo: boolean;
          peso_g_padrao: number | null;
          dimensoes_cm_padrao: DimensoesCm | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          nome: string;
          descricao?: string | null;
          ativo?: boolean;
          peso_g_padrao?: number | null;
          dimensoes_cm_padrao?: DimensoesCm | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          descricao?: string | null;
          ativo?: boolean;
          peso_g_padrao?: number | null;
          dimensoes_cm_padrao?: DimensoesCm | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      envios: {
        Relationships: [
          {
            foreignKeyName: "envios_proposta_id_fkey";
            columns: ["proposta_id"];
            referencedRelation: "propostas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "envios_influencer_id_fkey";
            columns: ["influencer_id"];
            referencedRelation: "influencers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "envios_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "envios_embalagem_id_fkey";
            columns: ["embalagem_id"];
            referencedRelation: "embalagens";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          proposta_id: string | null;
          influencer_id: string | null;
          lead_id: string | null;
          destinatario_nome: string;
          endereco_destino: EnderecoDestino | null;
          embalagem_id: string | null;
          peso_g: number | null;
          dimensoes_cm: DimensoesCm | null;
          status: EnvioStatus;
          transportadora: string | null;
          servico: string | null;
          codigo_rastreio: string | null;
          tracking_url: string | null;
          valor_frete: number | null;
          valor_seguro: number | null;
          melhor_envio_order_id: string | null;
          etiqueta_url: string | null;
          data_postagem: string | null;
          data_entrega_prevista: string | null;
          data_entrega_efetiva: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          proposta_id?: string | null;
          influencer_id?: string | null;
          lead_id?: string | null;
          destinatario_nome: string;
          endereco_destino?: EnderecoDestino | null;
          embalagem_id?: string | null;
          peso_g?: number | null;
          dimensoes_cm?: DimensoesCm | null;
          status?: EnvioStatus;
          transportadora?: string | null;
          servico?: string | null;
          codigo_rastreio?: string | null;
          tracking_url?: string | null;
          valor_frete?: number | null;
          valor_seguro?: number | null;
          melhor_envio_order_id?: string | null;
          etiqueta_url?: string | null;
          data_postagem?: string | null;
          data_entrega_prevista?: string | null;
          data_entrega_efetiva?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          proposta_id?: string | null;
          influencer_id?: string | null;
          lead_id?: string | null;
          destinatario_nome?: string;
          endereco_destino?: EnderecoDestino | null;
          embalagem_id?: string | null;
          peso_g?: number | null;
          dimensoes_cm?: DimensoesCm | null;
          status?: EnvioStatus;
          transportadora?: string | null;
          servico?: string | null;
          codigo_rastreio?: string | null;
          tracking_url?: string | null;
          valor_frete?: number | null;
          valor_seguro?: number | null;
          melhor_envio_order_id?: string | null;
          etiqueta_url?: string | null;
          data_postagem?: string | null;
          data_entrega_prevista?: string | null;
          data_entrega_efetiva?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      influencers: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          nome: string;
          handle_instagram: string | null;
          handle_tiktok: string | null;
          handle_youtube: string | null;
          seguidores_instagram: number | null;
          seguidores_tiktok: number | null;
          seguidores_youtube: number | null;
          engajamento_pct: number | null;
          nicho: string | null;
          cidade: string | null;
          uf: string | null;
          status: InfluencerStatus;
          contrato_tipo: InfluencerContratoTipo | null;
          valor_cache: number | null;
          codigo_promocional: string | null;
          posts_url: string[];
          alcance_total: number | null;
          engajamento_total: number | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          nome: string;
          handle_instagram?: string | null;
          handle_tiktok?: string | null;
          handle_youtube?: string | null;
          seguidores_instagram?: number | null;
          seguidores_tiktok?: number | null;
          seguidores_youtube?: number | null;
          engajamento_pct?: number | null;
          nicho?: string | null;
          cidade?: string | null;
          uf?: string | null;
          status?: InfluencerStatus;
          contrato_tipo?: InfluencerContratoTipo | null;
          valor_cache?: number | null;
          codigo_promocional?: string | null;
          posts_url?: string[];
          alcance_total?: number | null;
          engajamento_total?: number | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          handle_instagram?: string | null;
          handle_tiktok?: string | null;
          handle_youtube?: string | null;
          seguidores_instagram?: number | null;
          seguidores_tiktok?: number | null;
          seguidores_youtube?: number | null;
          engajamento_pct?: number | null;
          nicho?: string | null;
          cidade?: string | null;
          uf?: string | null;
          status?: InfluencerStatus;
          contrato_tipo?: InfluencerContratoTipo | null;
          valor_cache?: number | null;
          codigo_promocional?: string | null;
          posts_url?: string[];
          alcance_total?: number | null;
          engajamento_total?: number | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      influencer_pagamentos: {
        Relationships: [
          {
            foreignKeyName: "influencer_pagamentos_influencer_id_fkey";
            columns: ["influencer_id"];
            referencedRelation: "influencers";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          influencer_id: string;
          tipo: PagamentoTipo;
          valor: number;
          descricao_permuta: string | null;
          data_combinada: string;
          data_pago: string | null;
          status: PagamentoStatus;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          influencer_id: string;
          tipo: PagamentoTipo;
          valor?: number;
          descricao_permuta?: string | null;
          data_combinada?: string;
          data_pago?: string | null;
          status?: PagamentoStatus;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          influencer_id?: string;
          tipo?: PagamentoTipo;
          valor?: number;
          descricao_permuta?: string | null;
          data_combinada?: string;
          data_pago?: string | null;
          status?: PagamentoStatus;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      influencer_vendas: {
        Relationships: [
          {
            foreignKeyName: "influencer_vendas_influencer_id_fkey";
            columns: ["influencer_id"];
            referencedRelation: "influencers";
            referencedColumns: ["id"];
          },
        ];
        Row: {
          id: string;
          user_id: string;
          influencer_id: string;
          data_venda: string;
          quantidade: number;
          valor_total: number;
          comprador_nome: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          influencer_id: string;
          data_venda?: string;
          quantidade?: number;
          valor_total: number;
          comprador_nome?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          influencer_id?: string;
          data_venda?: string;
          quantidade?: number;
          valor_total?: number;
          comprador_nome?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Enums: {
      lead_status: LeadStatus;
      lead_temperatura: LeadTemperatura;
      decisor_prioridade: DecisorPrioridade;
      interacao_canal: InteracaoCanal;
      interacao_tipo: InteracaoTipo;
    };
  };
}

// Atalhos convenientes
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Decisor = Database["public"]["Tables"]["decisores"]["Row"];
export type DecisorInsert = Database["public"]["Tables"]["decisores"]["Insert"];
export type DecisorUpdate = Database["public"]["Tables"]["decisores"]["Update"];

export type Interacao = Database["public"]["Tables"]["interacoes"]["Row"];
export type InteracaoInsert = Database["public"]["Tables"]["interacoes"]["Insert"];
export type InteracaoUpdate = Database["public"]["Tables"]["interacoes"]["Update"];

export type Vertical = Database["public"]["Tables"]["verticais"]["Row"];
export type VerticalInsert = Database["public"]["Tables"]["verticais"]["Insert"];

export type TarefaSemanal =
  Database["public"]["Tables"]["tarefas_semanais"]["Row"];
export type TarefaSemanalInsert =
  Database["public"]["Tables"]["tarefas_semanais"]["Insert"];

export type CategoriaTarefa =
  Database["public"]["Tables"]["categorias_tarefa"]["Row"];
export type CategoriaTarefaInsert =
  Database["public"]["Tables"]["categorias_tarefa"]["Insert"];
export type CategoriaTarefaUpdate =
  Database["public"]["Tables"]["categorias_tarefa"]["Update"];

export type Link = Database["public"]["Tables"]["links"]["Row"];
export type LinkInsert = Database["public"]["Tables"]["links"]["Insert"];
export type LinkUpdate = Database["public"]["Tables"]["links"]["Update"];

export type MensagemTemplate =
  Database["public"]["Tables"]["mensagem_templates"]["Row"];
export type MensagemTemplateInsert =
  Database["public"]["Tables"]["mensagem_templates"]["Insert"];
export type MensagemTemplateUpdate =
  Database["public"]["Tables"]["mensagem_templates"]["Update"];

export type Informacao = Database["public"]["Tables"]["informacoes"]["Row"];
export type InformacaoInsert =
  Database["public"]["Tables"]["informacoes"]["Insert"];
export type InformacaoUpdate =
  Database["public"]["Tables"]["informacoes"]["Update"];

export type Venda = Database["public"]["Tables"]["vendas"]["Row"];
export type VendaInsert = Database["public"]["Tables"]["vendas"]["Insert"];
export type VendaUpdate = Database["public"]["Tables"]["vendas"]["Update"];

export type Proposta = Database["public"]["Tables"]["propostas"]["Row"];
export type PropostaInsert =
  Database["public"]["Tables"]["propostas"]["Insert"];
export type PropostaUpdate =
  Database["public"]["Tables"]["propostas"]["Update"];

export type Embalagem = Database["public"]["Tables"]["embalagens"]["Row"];
export type EmbalagemInsert =
  Database["public"]["Tables"]["embalagens"]["Insert"];
export type EmbalagemUpdate =
  Database["public"]["Tables"]["embalagens"]["Update"];

export type Envio = Database["public"]["Tables"]["envios"]["Row"];
export type EnvioInsert = Database["public"]["Tables"]["envios"]["Insert"];
export type EnvioUpdate = Database["public"]["Tables"]["envios"]["Update"];

export type MelhorEnvioConexao =
  Database["public"]["Tables"]["melhor_envio_conexao"]["Row"];
export type MelhorEnvioConexaoInsert =
  Database["public"]["Tables"]["melhor_envio_conexao"]["Insert"];
export type MelhorEnvioConexaoUpdate =
  Database["public"]["Tables"]["melhor_envio_conexao"]["Update"];

export type MelhorEnvioRemetente =
  Database["public"]["Tables"]["melhor_envio_remetente"]["Row"];
export type MelhorEnvioRemetenteInsert =
  Database["public"]["Tables"]["melhor_envio_remetente"]["Insert"];
export type MelhorEnvioRemetenteUpdate =
  Database["public"]["Tables"]["melhor_envio_remetente"]["Update"];

export type Influencer = Database["public"]["Tables"]["influencers"]["Row"];
export type InfluencerInsert =
  Database["public"]["Tables"]["influencers"]["Insert"];
export type InfluencerUpdate =
  Database["public"]["Tables"]["influencers"]["Update"];

export type InfluencerPagamento =
  Database["public"]["Tables"]["influencer_pagamentos"]["Row"];
export type InfluencerPagamentoInsert =
  Database["public"]["Tables"]["influencer_pagamentos"]["Insert"];
export type InfluencerPagamentoUpdate =
  Database["public"]["Tables"]["influencer_pagamentos"]["Update"];

export type InfluencerVenda =
  Database["public"]["Tables"]["influencer_vendas"]["Row"];
export type InfluencerVendaInsert =
  Database["public"]["Tables"]["influencer_vendas"]["Insert"];
export type InfluencerVendaUpdate =
  Database["public"]["Tables"]["influencer_vendas"]["Update"];

// Categorias sugeridas (UI usa estas como autocomplete, mas user pode digitar livremente)
export const INFORMACAO_CATEGORIAS_SUGERIDAS = [
  "identificacao",
  "bancario",
  "contato",
  "credencial",
  "outro",
] as const;

export const INFORMACAO_CATEGORIA_LABELS: Record<string, string> = {
  identificacao: "Identificação",
  bancario: "Bancário",
  contato: "Contato",
  credencial: "Credenciais",
  outro: "Outro",
};

/**
 * Label legível para uma categoria. Se não estiver no map, faz fallback
 * humanizando o slug (snake_case → "Snake Case").
 */
export function informacaoCategoriaLabel(slug: string): string {
  if (slug in INFORMACAO_CATEGORIA_LABELS) {
    return INFORMACAO_CATEGORIA_LABELS[slug];
  }
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Tipos de link (categorias com ícone)
// ---------------------------------------------------------------------------

export const LINK_TIPOS = [
  "notion",
  "drive",
  "sheets",
  "docs",
  "calendar",
  "slack",
  "whatsapp",
  "youtube",
  "github",
  "email",
  "linkedin",
  "instagram",
  "outro",
] as const;
export type LinkTipo = (typeof LINK_TIPOS)[number];

export const LINK_TIPO_LABELS: Record<LinkTipo, string> = {
  notion: "Notion",
  drive: "Google Drive",
  sheets: "Google Sheets",
  docs: "Google Docs",
  calendar: "Google Calendar",
  slack: "Slack",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  github: "GitHub",
  email: "E-mail",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  outro: "Outro",
};
