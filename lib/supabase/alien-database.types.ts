// Tipos MÍNIMOS do schema do ALIEN (projeto gvgytwptlcufzcmgsauz) — só a tabela
// `tasks`, que é a fonte única de tarefas de todos os módulos (incl. HALO).
//
// ⚠️ Tipo MANUAL (não gerado): o Supabase CLI não estava disponível na sessão
// que criou este arquivo (sem binário e sem SUPABASE_ACCESS_TOKEN; a
// service-role é JWT e não serve pra `gen types`). Se um dia rodar
// `supabase gen types ... --project-id gvgytwptlcufzcmgsauz`, troque este
// arquivo pelo gerado.
//
// ⚠️ Colunas `semana`, `stand_by` e `category_id` entram aqui por decisão do
// dono do schema, mas NÃO foram verificadas contra o banco real (a migration em
// disco do ALIEN só tem o 0001_init; o resto foi aplicado direto no SQL Editor).
// Toda leitura deve usar `select('*')`, nunca nomear essas colunas, até a prova
// no preview confirmar que existem.

export type AlienStatus = "pendente" | "feita";
export type AlienPriority = "baixa" | "média" | "alta";
export type AlienSystem = "ALIEN" | "HALO" | "GMRM" | "MINER" | "PEGASUS";

export interface AlienTasksRow {
  id: string;
  title: string;
  details: string | null;
  due_date: string | null;
  empresa_id: string | null;
  escopo: "pessoal" | null;
  status: AlienStatus;
  priority: AlienPriority;
  category: string | null;
  category_color: string | null;
  system: AlienSystem;
  parent_id: string | null;
  ordem: number | null;
  semana: string | null;
  stand_by: boolean | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ⚠️ SUPOSIÇÃO NÃO-VERIFICADA: a tabela `categories` do ALIEN não tem rastro no
// código/migrations (foi criada direto no SQL Editor). Os nomes de coluna abaixo
// (nome/cor/ordem/system) são um palpite espelhando o `categorias_tarefa` do
// HALO. O script de prova dumpa o schema real — se divergir, corrigir AQUI.
export interface AlienCategoriesRow {
  id: string;
  nome: string;
  cor: string;
  ordem: number | null;
  system: AlienSystem;
  created_at: string;
  updated_at: string;
}

export interface AlienDatabase {
  public: {
    Tables: {
      tasks: {
        Row: AlienTasksRow;
        Insert: Partial<AlienTasksRow> & { title: string };
        Update: Partial<AlienTasksRow>;
        Relationships: [];
      };
      categories: {
        Row: AlienCategoriesRow;
        Insert: Partial<AlienCategoriesRow> & { nome: string };
        Update: Partial<AlienCategoriesRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
