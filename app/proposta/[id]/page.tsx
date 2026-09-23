import { createSessionClient } from "@/lib/supabase/session";
import { notFound } from "next/navigation";
import { formatBR } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSessionClient();

  const { data: proposta, error } = await supabase
    .from("propostas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proposta) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{proposta.titulo || "Proposta"}</h1>
          <p className="text-muted-foreground">{proposta.cliente}</p>
        </div>

        <div className="halo-glass rounded-halo p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valor</p>
              <p className="font-medium">
                {proposta.valor
                  ? `R$ ${Number(proposta.valor).toLocaleString("pt-BR")}`
                  : "A combinar"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Validade</p>
              <p className="font-medium">
                {proposta.validade
                  ? formatBR(proposta.validade)
                  : "Não definida"}
              </p>
            </div>
          </div>

          {proposta.observacoes && (
            <div>
              <p className="text-muted-foreground text-sm">Observações</p>
              <p className="mt-1">{proposta.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
