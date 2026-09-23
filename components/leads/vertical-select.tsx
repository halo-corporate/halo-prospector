"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createVerticalAction } from "@/lib/verticais/actions";
import type { Vertical } from "@/lib/database.types";

interface Props {
  /** Lista de verticais do banco (default + customizadas). */
  verticais: Pick<Vertical, "slug" | "label">[];
  /** Slugs atualmente selecionados (controlled). */
  value: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
  /** Texto exibido se a lista do banco vier vazia. */
  emptyHint?: string;
}

/**
 * Multi-select de vertical em chips, com "+ Nova vertical…" inline.
 * Padrão coerente com MultiSelectChips, mas com o atalho de criação.
 * Em sucesso ao criar uma nova, ela vira slug e entra na seleção atual.
 */
export function VerticalSelect({
  verticais,
  value,
  onChange,
  disabled,
  emptyHint,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoLabel, setNovoLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(slug: string) {
    if (disabled) return;
    if (value.includes(slug)) {
      onChange(value.filter((x) => x !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  function handleCreate() {
    const label = novoLabel.trim();
    if (!label) return;
    startTransition(async () => {
      const res = await createVerticalAction(label);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Vertical "${res.label}" adicionada`);
      setDialogOpen(false);
      setNovoLabel("");
      // Seleciona a recém-criada automaticamente.
      if (!value.includes(res.slug)) {
        onChange([...value, res.slug]);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {verticais.length === 0 && emptyHint ? (
          <p className="text-xs text-muted-foreground italic">{emptyHint}</p>
        ) : null}

        {verticais.map((v) => {
          const selected = value.includes(v.slug);
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => toggle(v.slug)}
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
              <span>{v.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-dashed border-primary/40 text-primary px-2.5 py-1 text-xs transition-colors hover:bg-primary/10",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <Plus className="h-3 w-3" />
          <span>Nova vertical</span>
        </button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setNovoLabel("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova vertical</DialogTitle>
            <DialogDescription>
              Crie uma vertical fora das 5 padrões. Vai aparecer pra você em
              todos os selects de lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="vertical-novo-label">Nome</Label>
            <Input
              id="vertical-novo-label"
              autoFocus
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              placeholder="ex: Estúdios de Yoga Premium"
              maxLength={60}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Vai virar slug automaticamente (sem acento, snake_case).
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={pending || !novoLabel.trim()}
            >
              {pending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
