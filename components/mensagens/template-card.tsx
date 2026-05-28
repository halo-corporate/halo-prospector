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

function etapaLabel(slug: string | null): string | null {
  if (!slug) return null;
  if (slug in LEAD_STATUS_LABELS) {
    return LEAD_STATUS_LABELS[slug as LeadStatus];
  }
  return slug.replace(/_/g, " ");
}

interface Props {
  template: MensagemTemplate;
}

export function TemplateCard({ template }: Props) {
  const [pending, startTransition] = useTransition();
  const Icon = CANAL_ICONS[template.canal];

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTemplateAction(template.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  const etapa = etapaLabel(template.etapa_funil);

  return (
    <div
      className={cn(
        "group rounded-[18px] border border-white/10 bg-card/40 p-4 transition-colors hover:border-white/20 flex flex-col gap-3",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {MENSAGEM_CANAL_LABELS[template.canal]}
            </p>
            {etapa ? (
              <Badge
                variant="outline"
                className="border border-primary/25 bg-primary/5 text-primary text-[10px] py-0"
              >
                {etapa}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
