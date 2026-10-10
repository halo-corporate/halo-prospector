"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type TarefaSemanal } from "@/lib/database.types";

interface Props {
  tarefas: TarefaSemanal[];
}

export function CopyPendingButton({ tarefas }: Props) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleCopy() {
    if (tarefas.length === 0) return;

    startTransition(async () => {
      try {
        const texto = tarefas.map((t) => `- ${t.texto}`).join("\n");
        await navigator.clipboard.writeText(texto);
        setCopied(true);
        toast.success(`${tarefas.length} tarefa${tarefas.length > 1 ? "s" : ""} copiada${tarefas.length > 1 ? "s" : ""}`);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error("Não foi possível copiar");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "default" : "outline"}
      onClick={handleCopy}
      disabled={pending || tarefas.length === 0}
      className="h-8"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copiar pendentes ({tarefas.length})
        </>
      )}
    </Button>
  );
}
