"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Copia o texto pro clipboard. Mostra check feedback por 1.5s.
 */
export function CopyButton({ text, label = "Copiar", className }: Props) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleCopy() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado pra área de transferência");
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
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
      disabled={pending}
      className={cn("h-8", className)}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
