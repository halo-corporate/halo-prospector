"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Mail,
  Phone,
  Instagram as InstagramIcon,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  DECISOR_PRIORIDADE_LABELS,
  type Decisor,
  type DecisorPrioridade,
} from "@/lib/database.types";
import {
  deleteDecisorAction,
  updateDecisorAction,
} from "@/lib/decisores/actions";

interface Props {
  decisor: Decisor;
}

function prioridadeBadgeClass(p: DecisorPrioridade): string {
  switch (p) {
    case "d1":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "d2":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "d3":
      return "bg-zinc-700/40 text-zinc-400 border-zinc-700";
  }
}

export function DecisorCard({ decisor }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  // Estado de edição
  const [nome, setNome] = useState(decisor.nome);
  const [cargo, setCargo] = useState(decisor.cargo ?? "");
  const [telefone, setTelefone] = useState(decisor.telefone ?? "");
  const [email, setEmail] = useState(decisor.email ?? "");
  const [instagram, setInstagram] = useState(decisor.instagram ?? "");
  const [prioridade, setPrioridade] = useState<DecisorPrioridade>(
    decisor.prioridade,
  );

  function handleToggleContatado() {
    startTransition(async () => {
      const res = await updateDecisorAction(
        decisor.id,
        { contatado: !decisor.contatado },
        decisor.lead_id,
      );
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateDecisorAction(
        decisor.id,
        { nome, cargo, telefone, email, instagram, prioridade },
        decisor.lead_id,
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setEditing(false);
      toast.success("Decisor atualizado");
    });
  }

  function handleCancel() {
    setNome(decisor.nome);
    setCargo(decisor.cargo ?? "");
    setTelefone(decisor.telefone ?? "");
    setEmail(decisor.email ?? "");
    setInstagram(decisor.instagram ?? "");
    setPrioridade(decisor.prioridade);
    setEditing(false);
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteDecisorAction(decisor.id, decisor.lead_id);
      if (!res.ok) toast.error(res.message);
    });
  }

  if (editing) {
    return (
      <div className="rounded-md border border-border bg-card p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 col-span-2">
            <Label htmlFor={`nome-${decisor.id}`} className="text-xs">
              Nome *
            </Label>
            <Input
              id={`nome-${decisor.id}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cargo</Label>
            <Input
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select
              value={prioridade}
              onValueChange={(v) => setPrioridade(v as DecisorPrioridade)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DECISOR_PRIORIDADE_LABELS) as DecisorPrioridade[]).map(
                  (p) => (
                    <SelectItem key={p} value={p}>
                      {DECISOR_PRIORIDADE_LABELS[p]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Telefone</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Instagram</Label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="h-8 text-sm"
              placeholder="@handle"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={pending || !nome.trim()}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-md border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{decisor.nome}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-1.5 py-0 text-[10px] font-medium",
                prioridadeBadgeClass(decisor.prioridade),
              )}
            >
              {DECISOR_PRIORIDADE_LABELS[decisor.prioridade]}
            </span>
            {decisor.contatado ? (
              <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0 text-[10px] font-medium text-emerald-300">
                <Check className="h-2.5 w-2.5" /> contatado
              </span>
            ) : null}
          </div>
          {decisor.cargo ? (
            <p className="text-xs text-muted-foreground truncate">{decisor.cargo}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setEditing(true)}
            disabled={pending}
            aria-label="Editar"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir decisor?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{decisor.nome}</strong> vai ser
                  removido permanentemente. Interações vinculadas a ele
                  permanecem, só desvinculadas.
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

      {decisor.telefone || decisor.email || decisor.instagram ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
          {decisor.telefone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" />
              {decisor.telefone}
            </span>
          ) : null}
          {decisor.email ? (
            <a
              href={`mailto:${decisor.email}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="h-2.5 w-2.5" />
              {decisor.email}
            </a>
          ) : null}
          {decisor.instagram ? (
            <a
              href={`https://instagram.com/${decisor.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <InstagramIcon className="h-2.5 w-2.5" />
              {decisor.instagram}
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleToggleContatado}
        disabled={pending}
        className={cn(
          "w-full text-[11px] py-1 rounded-sm border border-border/40 hover:border-border transition-colors",
          decisor.contatado
            ? "text-muted-foreground"
            : "text-foreground hover:bg-accent",
        )}
      >
        {decisor.contatado ? "Desmarcar contatado" : "Marcar como contatado"}
      </button>
    </div>
  );
}
