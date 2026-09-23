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

  const iconOnly = label.trim() === "";
  return (
    <Button
      type="button"
      size={iconOnly ? "icon" : "sm"}
      variant={copied ? "default" : iconOnly ? "ghost" : "outline"}
      onClick={handleCopy}
      disabled={pending}
      className={cn(iconOnly ? "h-6 w-6" : "h-8", className)}
      aria-label={iconOnly ? (copied ? "Copiado" : "Copiar") : undefined}
    >
      {copied ? (
        <>
          <Check className={iconOnly ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {iconOnly ? null : "Copiado"}
        </>
      ) : (
        <>
          <Copy className={iconOnly ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {iconOnly ? null : label}
        </>
      )}
    </Button>
  );
}
