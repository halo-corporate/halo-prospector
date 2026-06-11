"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createCategoriaAction,
  deleteCategoriaAction,
  updateCategoriaAction,
} from "@/lib/categorias/actions";
import type { CategoriaTarefa } from "@/lib/database.types";

const DEFAULT_COR = "#0071E3";

interface Props {
  categorias: CategoriaTarefa[];
}

export function GerenciarCategoriasDialog({ categorias }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags className="h-3.5 w-3.5" />
          Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>
            Crie categorias pra agrupar as tarefas. Apagar uma categoria não
            apaga as tarefas — elas voltam pra “Sem categoria”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma categoria ainda. Crie a primeira aí embaixo.
            </p>
          ) : (
            categorias.map((c) => (
              <CategoriaRow key={c.id} categoria={c} onDone={router.refresh} />
            ))
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <AddCategoriaRow onDone={router.refresh} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoriaRow({
  categoria,
  onDone,
}: {
  categoria: CategoriaTarefa;
  onDone: () => void;
}) {
  const [nome, setNome] = useState(categoria.nome);
  const [cor, setCor] = useState(categoria.cor);
  const [pending, startTransition] = useTransition();

  const dirty =
    nome.trim() !== categoria.nome || cor.toLowerCase() !== categoria.cor.toLowerCase();

  function handleSave() {
    const n = nome.trim();
    if (!n) return;
    startTransition(async () => {
      const res = await updateCategoriaAction(categoria.id, n, cor);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Categoria atualizada");
      onDone();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCategoriaAction(categoria.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Categoria removida");
      onDone();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={cor}
        onChange={(e) => setCor(e.target.value)}
        disabled={pending}
        aria-label="Cor da categoria"
        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
      />
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) {
            e.preventDefault();
            handleSave();
          }
        }}
        maxLength={40}
        disabled={pending}
        className="h-8 flex-1 text-sm"
      />
      {dirty ? (
        <Button
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={handleSave}
          disabled={pending || !nome.trim()}
        >
          Salvar
        </Button>
      ) : null}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 hover:text-destructive"
        onClick={handleDelete}
        disabled={pending}
        aria-label={`Excluir categoria ${categoria.nome}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AddCategoriaRow({ onDone }: { onDone: () => void }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(DEFAULT_COR);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const n = nome.trim();
    if (!n) return;
    startTransition(async () => {
      const res = await createCategoriaAction(n, cor);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setNome("");
      setCor(DEFAULT_COR);
      toast.success("Categoria criada");
      onDone();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={cor}
        onChange={(e) => setCor(e.target.value)}
        disabled={pending}
        aria-label="Cor da nova categoria"
        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
      />
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Nova categoria…"
        maxLength={40}
        disabled={pending}
        className="h-8 flex-1 text-sm"
      />
      <Button
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={handleAdd}
        disabled={pending || !nome.trim()}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}
