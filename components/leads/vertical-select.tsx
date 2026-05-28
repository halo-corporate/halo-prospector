"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createVerticalAction } from "@/lib/verticais/actions";
import type { Vertical } from "@/lib/database.types";

const ADD_NEW = "__add_new__";
const ANY = "__any__";

interface Props {
  /** Lista de verticais do banco (default + customizadas). */
  verticais: Pick<Vertical, "slug" | "label">[];
  /** Slug atual (controlled). undefined = "Todas" no filtro; obrigatório no form. */
  value?: string;
  onChange: (slug: string | undefined) => void;
  /** Se true, mostra "Todas verticais" no topo (modo filtro). */
  includeAny?: boolean;
  placeholder?: string;
  id?: string;
}

/**
 * Select de vertical com "+ Nova vertical" inline.
 * Em sucesso ao criar, seleciona automaticamente a nova.
 */
export function VerticalSelect({
  verticais,
  value,
  onChange,
  includeAny = false,
  placeholder = "Selecione…",
  id,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoLabel, setNovoLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSelectChange(v: string) {
    if (v === ADD_NEW) {
      setDialogOpen(true);
      return;
    }
    if (v === ANY) {
      onChange(undefined);
      return;
    }
    onChange(v);
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
      // Seleciona a recém-criada — o slug volta da action.
      onChange(res.slug);
    });
  }

  const selectValue = value ?? (includeAny ? ANY : undefined);

  return (
    <>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAny ? (
            <SelectItem value={ANY}>Todas verticais</SelectItem>
          ) : null}
          {verticais.map((v) => (
            <SelectItem key={v.slug} value={v.slug}>
              {v.label}
            </SelectItem>
          ))}
          <SelectItem value={ADD_NEW}>
            <span className="flex items-center gap-1.5 text-primary">
              <Plus className="h-3.5 w-3.5" />
              Nova vertical…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

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
