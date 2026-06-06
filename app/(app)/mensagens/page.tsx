import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listEtapas, listTemplates } from "@/lib/mensagens/queries";
import {
  MENSAGEM_CANAIS,
  type MensagemCanal,
} from "@/lib/database.types";
import { TemplateCard } from "@/components/mensagens/template-card";
import { TemplateFormDialog } from "@/components/mensagens/template-form-dialog";
import { TemplatesFilters } from "@/components/mensagens/templates-filters";

export const metadata = { title: "Mensagens-modelo — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  canal?: string;
  etapa?: string;
  q?: string;
}

function isCanal(v: string | undefined): MensagemCanal | undefined {
  return v && (MENSAGEM_CANAIS as string[]).includes(v)
    ? (v as MensagemCanal)
    : undefined;
}

export default async function MensagensPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    canal: isCanal(searchParams.canal),
    etapa: searchParams.etapa || undefined,
    q: searchParams.q || undefined,
  };

  const [templates, etapasExtras] = await Promise.all([
    listTemplates(filters),
    listEtapas(),
  ]);

  const noFiltersActive = !filters.canal && !filters.etapa && !filters.q;

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Mensagens</p>
          <h1 className="title-display text-2xl">Mensagens-modelo</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length === 0 && noFiltersActive
              ? "Templates reutilizáveis de WhatsApp, e-mail e outros canais."
              : `${templates.length} ${templates.length === 1 ? "template" : "templates"} encontrados`}
          </p>
        </div>
        <TemplateFormDialog mode="create" />
      </div>

      <TemplatesFilters defaults={filters} etapasExtras={etapasExtras} />

      {templates.length === 0 ? (
        noFiltersActive ? (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhum template cadastrado
              </h2>
              <p className="text-sm text-muted-foreground">
                Crie templates por canal e etapa do funil pra acelerar o
                primeiro contato e o follow-up. Variáveis tipo{" "}
                <code className="text-primary">{"{nome_cliente}"}</code> ficam
                no clipboard intactas pra você substituir manualmente.
              </p>
            </div>
            <TemplateFormDialog
              mode="create"
              trigger={
                <Button size="sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Criar primeiro template
                </Button>
              }
            />
          </div>
        ) : (
          <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
            Nenhum template encontrado com esses filtros.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}
