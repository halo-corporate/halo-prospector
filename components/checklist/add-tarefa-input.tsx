"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTarefaAction } from "@/lib/tarefas/actions";

interface Props {
  weekStartISO?: string;
  placeholder?: string;
}

export function AddTarefaInput({ weekStartISO, placeholder }: Props) {
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const t = texto.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await createTarefaAction(t, weekStartISO);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setTexto("");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder={placeholder ?? "Adicionar tarefa…"}
        maxLength={200}
        disabled={pending}
        className="flex-1"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={pending || !texto.trim()}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </Button>
    </div>
  );
}
