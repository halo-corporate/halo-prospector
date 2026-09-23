"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LINK_TIPOS,
  LINK_TIPO_LABELS,
  type Link as LinkRow,
  type LinkTipo,
} from "@/lib/database.types";
import { createLinkAction, updateLinkAction } from "@/lib/links/actions";

interface Props {
  mode: "create" | "edit";
  link?: LinkRow;
  /** Trigger personalizado. Se ausente, renderiza um botão default por modo. */
  trigger?: React.ReactNode;
}

export function LinkFormDialog({ mode, link, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(link?.titulo ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [descricao, setDescricao] = useState(link?.descricao ?? "");
  const [tipo, setTipo] = useState<LinkTipo>(
    (link?.tipo as LinkTipo) ?? "outro",
  );
  const [pending, startTransition] = useTransition();

  // Sincroniza estado a partir das props SEMPRE que o dialog abre,
  // pra refletir mudanças do prop entre re-aberturas (Realtime/revalidate).
  useEffect(() => {
    if (open) {
      setTitulo(link?.titulo ?? "");
      setUrl(link?.url ?? "");
      setDescricao(link?.descricao ?? "");
      setTipo((link?.tipo as LinkTipo) ?? "outro");
    }
  }, [open, link?.id, link?.titulo, link?.url, link?.descricao, link?.tipo]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("titulo", titulo);
    fd.set("url", url);
    fd.set("descricao", descricao);
    fd.set("tipo", tipo);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createLinkAction(fd)
          : await updateLinkAction(link!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        mode === "create" ? "Link adicionado" : "Link atualizado",
      );
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Novo link
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo link" : "Editar link"}
          </DialogTitle>
          <DialogDescription>
            Cole a URL completa. Se esquecer https://, eu adiciono.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="link-titulo">Título *</Label>
            <Input
              id="link-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex: Planilha de comissões"
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="docs.google.com/spreadsheets/…"
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as LinkTipo)}>
              <SelectTrigger id="link-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LINK_TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-desc">Descrição</Label>
            <Textarea
              id="link-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="O que tem aqui? (opcional)"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {descricao.length}/200
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !titulo.trim() || !url.trim()}
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Adicionar"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
