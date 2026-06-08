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
import { createEmbalagemQuickAction } from "@/lib/embalagens/actions";
import type { Embalagem } from "@/lib/database.types";

interface Props {
  /** Lista de embalagens ativas do banco. */
  embalagens: Pick<Embalagem, "id" | "nome">[];
  /** id selecionado (null = nenhuma). */
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

/**
 * Single-select de embalagem em chips, com "+ Nova embalagem…" inline.
 * Mesma estética do VerticalSelect (chip multi), mas single-select porque
 * envio só tem 1 embalagem. Clicar de novo na chip selecionada desmarca.
 */
export function EmbalagemSelect({
  embalagens,
  value,
  onChange,
  disabled,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    if (disabled) return;
    onChange(value === id ? null : id);
  }

  function handleCreate() {
    const nome = novoNome.trim();
    if (!nome) return;
    startTransition(async () => {
      const res = await createEmbalagemQuickAction(nome);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Embalagem "${res.nome}" adicionada`);
      setDialogOpen(false);
      setNovoNome("");
      if (res.id) onChange(res.id);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {embalagens.map((e) => {
          const selected = value === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => toggle(e.id)}
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
              <span>{e.nome}</span>
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
          <span>Nova embalagem</span>
        </button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setNovoNome("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova embalagem</DialogTitle>
            <DialogDescription>
              Adiciona um tipo de embalagem. Peso e dimensões padrão podem ser
              configurados depois nas configurações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="embalagem-novo-nome">Nome</Label>
            <Input
              id="embalagem-novo-nome"
              autoFocus
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="ex: Caixa Premium HALO"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
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
              disabled={pending || !novoNome.trim()}
            >
              {pending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
