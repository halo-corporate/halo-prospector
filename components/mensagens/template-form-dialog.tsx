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
  LEAD_STATUS_LABELS,
  MENSAGEM_CANAIS,
  MENSAGEM_CANAL_LABELS,
  type LeadStatus,
  type MensagemCanal,
  type MensagemTemplate,
} from "@/lib/database.types";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/lib/mensagens/actions";
import { DEFAULT_TEMPLATE_VARS } from "@/lib/mensagens/highlight";

const ETAPA_NONE = "_none_";

interface Props {
  mode: "create" | "edit";
  template?: MensagemTemplate;
  trigger?: React.ReactNode;
}

export function TemplateFormDialog({ mode, template, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(template?.titulo ?? "");
  const [canal, setCanal] = useState<MensagemCanal>(
    template?.canal ?? "whatsapp",
  );
  const [etapaFunil, setEtapaFunil] = useState<string>(
    template?.etapa_funil ?? ETAPA_NONE,
  );
  const [assunto, setAssunto] = useState(template?.assunto ?? "");
  const [corpo, setCorpo] = useState(template?.corpo ?? "");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitulo(template?.titulo ?? "");
    setCanal(template?.canal ?? "whatsapp");
    setEtapaFunil(template?.etapa_funil ?? ETAPA_NONE);
    setAssunto(template?.assunto ?? "");
    setCorpo(template?.corpo ?? "");
  }

  useEffect(() => {
    if (!open) reset();
  }, [
    open,
    template?.id,
    template?.titulo,
    template?.canal,
    template?.etapa_funil,
    template?.assunto,
    template?.corpo,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInsertVar(name: string) {
    setCorpo((c) => `${c}{${name}}`);
  }

  function handleSubmit() {
    const fd = new FormData();
    fd.set("titulo", titulo);
    fd.set("canal", canal);
    fd.set("etapa_funil", etapaFunil === ETAPA_NONE ? "" : etapaFunil);
    fd.set("assunto", assunto);
    fd.set("corpo", corpo);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createTemplateAction(fd)
          : await updateTemplateAction(template!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        mode === "create" ? "Template criado" : "Template atualizado",
      );
      setOpen(false);
    });
  }

  const showAssunto = canal === "email";

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Novo template
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo template" : "Editar template"}
          </DialogTitle>
          <DialogDescription>
            Use variáveis tipo {"{nome_cliente}"}, {"{empresa}"}, {"{valor}"} —
            elas ficam no clipboard intactas pra você substituir manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-titulo">Título *</Label>
            <Input
              id="tpl-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex: Primeira abordagem clínica"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-canal">Canal *</Label>
              <Select
                value={canal}
                onValueChange={(v) => setCanal(v as MensagemCanal)}
              >
                <SelectTrigger id="tpl-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MENSAGEM_CANAIS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MENSAGEM_CANAL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-etapa">Etapa do funil</Label>
              <Select value={etapaFunil} onValueChange={setEtapaFunil}>
                <SelectTrigger id="tpl-etapa">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ETAPA_NONE}>— Genérico</SelectItem>
                  {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showAssunto ? (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-assunto">Assunto (e-mail)</Label>
              <Input
                id="tpl-assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="ex: Nova proposta — {empresa}"
                maxLength={200}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="tpl-corpo">Corpo *</Label>
            <Textarea
              id="tpl-corpo"
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder={`Oi {nome_cliente}, tudo bem?\n\nVi que a {empresa} é referência em…`}
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                <span>Variáveis padrão:</span>
                {DEFAULT_TEMPLATE_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVar(v)}
                    className="rounded-sm bg-primary/10 text-primary border border-primary/25 px-1.5 py-0 font-mono hover:bg-primary/20 transition-colors"
                  >
                    {"{" + v + "}"}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {corpo.length}/4000
              </span>
            </div>
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
            disabled={pending || !titulo.trim() || !corpo.trim()}
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar template"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
