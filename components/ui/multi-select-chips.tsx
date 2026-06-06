"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Texto exibido quando nada selecionado */
  placeholder?: string;
  className?: string;
}

/**
 * Multi-select estilo "chip" — clique no chip alterna seleção.
 * Chip preenchido (bg-primary/20 + border-primary/50 + text-primary + check)
 * = selecionado. Chip vazio = não selecionado.
 *
 * Vantagens vs popover/dropdown: tudo visível, sem cliques extras pra ver
 * o que tá selecionado. Bom pra listas curtas (até ~12 opções).
 */
export function MultiSelectChips({
  options,
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: Props) {
  function toggle(v: string) {
    if (disabled) return;
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  }

  if (options.length === 0 && placeholder) {
    return (
      <p className="text-xs text-muted-foreground italic">{placeholder}</p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
              selected
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={selected}
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
