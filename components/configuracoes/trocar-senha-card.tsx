"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trocarSenhaAction } from "@/lib/auth/password-actions";

export function TrocarSenhaCard() {
  const [pending, startTransition] = useTransition();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");

  function handleSubmit() {
    if (!atual) {
      toast.error("Informe a senha atual.");
      return;
    }
    if (nova.length < 6) {
      toast.error("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (nova !== confirma) {
      toast.error("A confirmação não bate com a nova senha.");
      return;
    }
    startTransition(async () => {
      const res = await trocarSenhaAction(atual, nova);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Senha alterada com sucesso.");
      setAtual("");
      setNova("");
      setConfirma("");
    });
  }

  return (
    <div className="halo-glass rounded-halo p-4 space-y-4 max-w-md">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary shrink-0" />
        <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
          Trocar senha
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha-atual">Senha atual</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha-nova">Nova senha</Label>
        <Input
          id="senha-nova"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Mín. 6 caracteres"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha-confirma">Confirmar nova senha</Label>
        <Input
          id="senha-confirma"
          type="password"
          autoComplete="new-password"
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
        />
      </div>

      <Button type="button" onClick={handleSubmit} disabled={pending}>
        <KeyRound className="h-3.5 w-3.5" />
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </div>
  );
}
