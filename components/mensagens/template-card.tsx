"use client";

import { useTransition } from "react";
import {
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Trash2,
  Instagram,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LEAD_STATUS_LABELS,
  MENSAGEM_CANAL_LABELS,
  type LeadStatus,
  type MensagemCanal,
  type MensagemTemplate,
} from "@/lib/database.types";
import { deleteTemplateAction } from "@/lib/mensagens/actions";
import { HighlightedBody } from "@/lib/mensagens/highlight";
import { CopyButton } from "./copy-button";
import { TemplateFormDialog } from "./template-form-dialog";

const CANAL_ICONS: Record<MensagemCanal, LucideIcon> = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  sms: Smartphone,
  outro: MessageCircle,
};

function etapaLabel(slug: string): string {
  if (slug in LEAD_STATUS_LABELS) {
    return LEAD_STATUS_LABELS[slug as LeadStatus];
  }
  return slug.replace(/_/g, " ");
}

/** Lê canais do template (array novo OU fallback no escalar antigo). */
function readCanais(t: MensagemTemplate): MensagemCanal[] {
  if (Array.isArray(t.canais) && t.canais.length > 0) return t.canais;
  return [t.canal];
}

/** Lê etapas do template (array novo OU fallback no escalar antigo). */
function readEtapas(t: MensagemTemplate): string[] {
  if (Array.isArray(t.etapas_funil) && t.etapas_funil.length > 0)
    return t.etapas_funil;
  return t.etapa_funil ? [t.etapa_funil] : [];
}

interface Props {
  template: MensagemTemplate;
}

export function TemplateCard({ template }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTemplateAction(template.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  const canais = readCanais(template);
  const etapas = readEtapas(template);
  const PrimaryIcon = CANAL_ICONS[canais[0]!];

  return (
    <div
      className={cn(
        "group halo-glass rounded-halo p-4 flex flex-col gap-3",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <PrimaryIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-1 flex-1">
            {/* Canais (badges com ícone) */}
            <div className="flex items-center gap-1 flex-wrap">
              {canais.map((c) => {
                const Icon = CANAL_ICONS[c];
                return (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 border border-white/10 rounded-sm px-1.5 py-0.5"
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {MENSAGEM_CANAL_LABELS[c]}
                  </span>
                );
              })}
            </div>
            {/* Etapas (badges azul) */}
            {etapas.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {etapas.map((e) => (
                  <Badge
                    key={e}
                    variant="outline"
                    className="border border-primary/25 bg-primary/5 text-primary text-[10px] py-0"
                  >
                    {etapaLabel(e)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <TemplateFormDialog mode="edit" template={template} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir template"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{template.titulo}</strong>{" "}
                  vai ser removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Título */}
      <h3 className="font-display font-bold uppercase tracking-[0.04em] text-sm leading-tight">
        {template.titulo}
      </h3>

      {/* Assunto (só email) */}
      {template.assunto ? (
        <p className="text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wide">Assunto:</span>{" "}
          <HighlightedBody
            text={template.assunto}
            className="text-foreground/90"
          />
        </p>
      ) : null}

      {/* Corpo com variáveis destacadas (preview truncado) */}
      <div className="text-xs text-foreground/80 leading-snug line-clamp-6 font-mono">
        <HighlightedBody text={template.corpo} />
      </div>

      {/* Copy button */}
      <div className="flex items-center justify-end pt-1 mt-auto">
        <CopyButton text={template.corpo} />
      </div>
    </div>
  );
}
