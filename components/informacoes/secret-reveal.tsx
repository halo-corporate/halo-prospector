"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/mensagens/copy-button";

interface Props {
  value: string;
  label?: string;
  className?: string;
}

/**
 * Campo de credencial mascarado por default. Toggle olho/olho-cortado
 * revela inline. Botão de copy sempre disponível (independe do toggle).
 * O toggle não persiste — fechar/abrir o card volta a mascarar.
 */
export function SecretReveal({ value, label, className }: Props) {
  const [visible, setVisible] = useState(false);
  const masked = "•".repeat(Math.min(Math.max(value.length, 6), 16));

  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", className)}>
      {label ? (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
          {label}
        </span>
      ) : null}
      <code
        className={cn(
          "flex-1 min-w-0 truncate font-mono text-xs",
          visible ? "text-foreground" : "text-muted-foreground tracking-widest",
        )}
        aria-label={visible ? "Senha revelada" : "Senha mascarada"}
      >
        {visible ? value : masked}
      </code>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar" : "Revelar"}
      >
        {visible ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
      <CopyButton text={value} label="" className="h-6 w-6 px-0" />
    </div>
  );
}
