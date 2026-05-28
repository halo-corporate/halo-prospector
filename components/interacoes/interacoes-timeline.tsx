"use client";

import { useTransition } from "react";
import {
  MessageSquare,
  Instagram as InstagramIcon,
  Mail,
  Phone,
  PhoneOff,
  Users,
  StickyNote,
  Globe,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  INTERACAO_CANAL_LABELS,
  INTERACAO_TIPO_LABELS,
  type Interacao,
  type InteracaoCanal,
} from "@/lib/database.types";
import { formatBR, formatBRHuman } from "@/lib/timezone";
import { deleteInteracaoAction } from "@/lib/interacoes/actions";

function canalIcon(canal: InteracaoCanal) {
  switch (canal) {
    case "whatsapp":
      return MessageSquare;
    case "instagram":
      return InstagramIcon;
    case "email":
      return Mail;
    case "telefone":
      return Phone;
    case "presencial":
      return Users;
    case "outro":
      return Globe;
  }
}

function tipoIsCallMissed(tipo: string) {
  return tipo === "ligacao_nao_atendida";
}

function tipoIsNota(tipo: string) {
  return tipo === "nota_interna";
}

interface Props {
  interacoes: Interacao[];
  leadId: string;
}

export function InteracoesTimeline({ interacoes, leadId }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteInteracaoAction(id, leadId);
      if (!res.ok) toast.error(res.message);
    });
  }

  if (interacoes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Nenhuma interação registrada ainda.
      </div>
    );
  }

  return (
    <ol className="relative space-y-3 pl-6 border-l border-border ml-2">
      {interacoes.map((i) => {
        const Icon = tipoIsCallMissed(i.tipo)
          ? PhoneOff
          : tipoIsNota(i.tipo)
            ? StickyNote
            : canalIcon(i.canal);
        return (
          <li key={i.id} className="group relative">
            <span
              className={cn(
                "absolute -left-[33px] top-1 h-5 w-5 rounded-full border bg-card flex items-center justify-center",
                tipoIsCallMissed(i.tipo)
                  ? "border-red-500/40 text-red-300"
                  : tipoIsNota(i.tipo)
                    ? "border-amber-500/40 text-amber-300"
                    : "border-border text-muted-foreground",
              )}
              aria-hidden="true"
            >
              <Icon className="h-3 w-3" />
            </span>

            <div className="rounded-md border border-border bg-card/40 p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs space-x-1.5">
                  <span className="font-medium text-foreground">
                    {INTERACAO_TIPO_LABELS[i.tipo]}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {INTERACAO_CANAL_LABELS[i.canal]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-[10px] text-muted-foreground"
                    title={formatBR(i.data_hora)}
                  >
                    {formatBRHuman(i.data_hora)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={() => handleDelete(i.id)}
                    disabled={pending}
                    aria-label="Excluir interação"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words leading-snug">
                {i.resumo}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
