"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  INFORMACAO_CATEGORIAS_SUGERIDAS,
  informacaoCategoriaLabel,
  type Informacao,
} from "@/lib/database.types";
import {
  createInformacaoAction,
  updateInformacaoAction,
} from "@/lib/informacoes/actions";

interface Props {
  mode: "create" | "edit";
  info?: Informacao;
  /** Categorias adicionais (vindas do banco) pra mostrar como sugestões */
  categoriasExistentes?: string[];
  trigger?: React.ReactNode;
}

/** Slug snake_case (espelha lib/informacoes/actions.ts:toSlug). */
function toSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** Lê categorias do info (array novo OU fallback no escalar antigo). */
function readCategorias(i: Informacao | undefined): string[] {
  if (!i) return [];
  if (Array.isArray(i.categorias) && i.categorias.length > 0) return i.categorias;
  return i.categoria ? [i.categoria] : [];
}

export function InfoFormDialog({
  mode,
  info,
  categoriasExistentes = [],
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [categorias, setCategorias] = useState<string[]>(readCategorias(info));
  const [categoriaDraft, setCategoriaDraft] = useState("");
  const [titulo, setTitulo] = useState(info?.titulo ?? "");
  const [valor, setValor] = useState(info?.valor ?? "");
  const [hasSecret, setHasSecret] = useState(Boolean(info?.valor_secreto));
  const [valorSecreto, setValorSecreto] = useState(info?.valor_secreto ?? "");
  const [revealSecret, setRevealSecret] = useState(false);
  const [observacoes, setObservacoes] = useState(info?.observacoes ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setCategorias(readCategorias(info));
      setCategoriaDraft("");
      setTitulo(info?.titulo ?? "");
      setValor(info?.valor ?? "");
      setHasSecret(Boolean(info?.valor_secreto));
      setValorSecreto(info?.valor_secreto ?? "");
      setRevealSecret(false);
      setObservacoes(info?.observacoes ?? "");
    }
  }, [
    open,
    info?.id,
    info?.categoria,
    info?.categorias,
    info?.titulo,
    info?.valor,
    info?.valor_secreto,
    info?.observacoes,
  ]);

  function toggleCategoria(slug: string) {
    setCategorias((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
  }

  function addCategoriaFromDraft() {
    const slug = toSlug(categoriaDraft);
    if (!slug) return;
    if (!categorias.includes(slug)) {
      setCategorias((prev) => [...prev, slug]);
    }
    setCategoriaDraft("");
  }

  function handleSubmit() {
    if (categorias.length === 0) {
      toast.error("Selecione ao menos 1 categoria");
      return;
    }
    const fd = new FormData();
    fd.set("categorias", categorias.join(","));
    fd.set("titulo", titulo);
    fd.set("valor", valor);
    fd.set("valor_secreto", hasSecret ? valorSecreto : "");
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createInformacaoAction(fd)
          : await updateInformacaoAction(info!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        mode === "create" ? "Informação criada" : "Informação atualizada",
      );
      setOpen(false);
    });
  }

  // Sugeridas + existentes (dedup), excluindo as já selecionadas
  const allSugestoes = Array.from(
    new Set([...INFORMACAO_CATEGORIAS_SUGERIDAS, ...categoriasExistentes]),
  ).filter((c) => !categorias.includes(c));

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Nova informação
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
            {mode === "create" ? "Nova informação" : "Editar informação"}
          </DialogTitle>
          <DialogDescription>
            CNPJ, dados bancários, contatos e credenciais. O valor secreto
            fica mascarado por default na lista.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="info-titulo">Título *</Label>
            <Input
              id="info-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex: CNPJ, Notion HALO, Chave PIX"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Categorias *{" "}
              <span className="text-muted-foreground font-normal">
                (1+ — uma info pode ter mais de uma)
              </span>
            </Label>

            {/* Chips selecionadas */}
            {categorias.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {categorias.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/50 bg-primary/20 text-primary text-xs px-2 py-0.5"
                  >
                    {informacaoCategoriaLabel(c)}
                    <button
                      type="button"
                      onClick={() => toggleCategoria(c)}
                      className="hover:opacity-70"
                      aria-label={`Remover ${c}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Sugestões clicáveis */}
            {allSugestoes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allSugestoes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategoria(c)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
                      "border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground transition-colors",
                    )}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {informacaoCategoriaLabel(c)}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Input livre */}
            <div className="flex items-center gap-1">
              <Input
                value={categoriaDraft}
                onChange={(e) => setCategoriaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategoriaFromDraft();
                  }
                }}
                placeholder="Adicionar categoria custom… (Enter)"
                maxLength={40}
                className="text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={addCategoriaFromDraft}
                disabled={!categoriaDraft.trim()}
              >
                Add
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Texto livre vira slug snake_case automaticamente.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="info-valor">Valor (visível) *</Label>
            <Input
              id="info-valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="ex: 12.345.678/0001-99 ou gabriel@halo.com"
              maxLength={2000}
            />
          </div>

          {/* Toggle de credencial */}
          <div className="rounded-md border border-white/10 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSecret}
                onChange={(e) => setHasSecret(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-xs font-medium">
                Tem credencial (senha/token)
              </span>
            </label>

            {hasSecret ? (
              <div className="space-y-1.5">
                <Label htmlFor="info-secreto" className="text-xs">
                  Valor secreto
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="info-secreto"
                    type={revealSecret ? "text" : "password"}
                    value={valorSecreto}
                    onChange={(e) => setValorSecreto(e.target.value)}
                    placeholder="••••••••"
                    maxLength={2000}
                    className="font-mono text-xs"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => setRevealSecret((v) => !v)}
                    aria-label={revealSecret ? "Ocultar" : "Mostrar"}
                  >
                    {revealSecret ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Armazenado no banco com RLS protegendo. Mascarado por default
                  na lista — só revela quando você clicar.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="info-obs">Observações</Label>
            <Textarea
              id="info-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="2FA ativo, código no 1Password, etc."
            />
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
            disabled={
              pending ||
              categorias.length === 0 ||
              !titulo.trim() ||
              !valor.trim() ||
              (hasSecret && !valorSecreto.trim())
            }
          >
            {pending ? "Salvando…" : mode === "create" ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
