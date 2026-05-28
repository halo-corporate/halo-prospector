"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  INFORMACAO_CATEGORIA_LABELS,
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

export function InfoFormDialog({
  mode,
  info,
  categoriasExistentes = [],
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(info?.categoria ?? "");
  const [titulo, setTitulo] = useState(info?.titulo ?? "");
  const [valor, setValor] = useState(info?.valor ?? "");
  const [hasSecret, setHasSecret] = useState(Boolean(info?.valor_secreto));
  const [valorSecreto, setValorSecreto] = useState(info?.valor_secreto ?? "");
  const [revealSecret, setRevealSecret] = useState(false);
  const [observacoes, setObservacoes] = useState(info?.observacoes ?? "");
  const [pending, startTransition] = useTransition();

  // Sincroniza estado a partir das props SEMPRE que o dialog abre.
  // (Antes só resetava em close, então valores do prop atualizados via
  // Realtime/revalidate ficavam stale entre re-aberturas.)
  useEffect(() => {
    if (open) {
      setCategoria(info?.categoria ?? "");
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
    info?.titulo,
    info?.valor,
    info?.valor_secreto,
    info?.observacoes,
  ]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("categoria", categoria);
    fd.set("titulo", titulo);
    fd.set("valor", valor);
    // Se o toggle hasSecret está OFF, manda vazio (zera no banco)
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

  // Junta sugeridas + existentes únicas
  const allCategorias = Array.from(
    new Set([...INFORMACAO_CATEGORIAS_SUGERIDAS, ...categoriasExistentes]),
  );

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
            <Label htmlFor="info-categoria">Categoria *</Label>
            <Input
              id="info-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="ex: identificacao, bancario, contato, credencial"
              maxLength={40}
              list="info-categoria-options"
            />
            <datalist id="info-categoria-options">
              {allCategorias.map((c) => (
                <option key={c} value={c}>
                  {INFORMACAO_CATEGORIA_LABELS[c] ?? informacaoCategoriaLabel(c)}
                </option>
              ))}
            </datalist>
            <p className="text-[10px] text-muted-foreground">
              Sugestões: identificacao, bancario, contato, credencial, outro.
              Vira slug automaticamente.
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
              !categoria.trim() ||
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
