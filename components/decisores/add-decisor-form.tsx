"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
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
  DECISOR_PRIORIDADE_LABELS,
  type DecisorPrioridade,
} from "@/lib/database.types";
import { createDecisorAction } from "@/lib/decisores/actions";

interface Props {
  leadId: string;
}

export function AddDecisorForm({ leadId }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [prioridade, setPrioridade] = useState<DecisorPrioridade>("d1");
  const [pending, startTransition] = useTransition();

  function reset() {
    setNome("");
    setCargo("");
    setTelefone("");
    setEmail("");
    setInstagram("");
    setPrioridade("d1");
  }

  function handleSubmit() {
    const fd = new FormData();
    fd.set("lead_id", leadId);
    fd.set("nome", nome);
    fd.set("cargo", cargo);
    fd.set("telefone", telefone);
    fd.set("email", email);
    fd.set("instagram", instagram);
    fd.set("prioridade", prioridade);

    startTransition(async () => {
      const res = await createDecisorAction(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Decisor adicionado");
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar decisor
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Novo decisor</p>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Nome *</Label>
          <Input
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
            placeholder="ex: Diretora clínica"
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
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={pending || !nome.trim()}
        >
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
