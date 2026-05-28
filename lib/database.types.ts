/**
 * Types do banco — espelham `supabase/migrations/0001_init.sql`.
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
// Enums
// ---------------------------------------------------------------------------

export type LeadVertical =
  | "clinicas_medicas"
  | "academias"
  | "wellness"
  | "corporativo"
  | "turismo_sono";

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

// ---------------------------------------------------------------------------
// Listas pra renderizar selects / labels em PT-BR
// ---------------------------------------------------------------------------

export const LEAD_VERTICAL_LABELS: Record<LeadVertical, string> = {
  clinicas_medicas: "Clínicas Médicas",
  academias: "Academias & Studios",
  wellness: "Wellness",
  corporativo: "Corporativo (Tech)",
  turismo_sono: "Turismo do Sono",
};

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
          vertical: LeadVertical;
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
          vertical: LeadVertical;
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
          vertical?: LeadVertical;
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Enums: {
      lead_vertical: LeadVertical;
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
