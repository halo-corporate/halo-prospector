"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
  INTERACAO_CANAL_LABELS,
  INTERACAO_TIPO_LABELS,
  type Decisor,
  type Interacao,
  type InteracaoCanal,
  type InteracaoTipo,
} from "@/lib/database.types";
import { nowBRInputValue, toDateTimeLocalBR } from "@/lib/timezone";
import {
  createInteracaoAction,
  updateInteracaoAction,
} from "@/lib/interacoes/actions";

interface Props {
  leadId: string;
  decisores: Pick<Decisor, "id" | "nome" | "prioridade">[];
  /** Quando presente, o dialog opera em modo edição (controlado externamente). */
  interacao?: Interacao;
  /** Open controlado (modo edição). Se ausente, o dialog gerencia o próprio. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const NONE = "_none_";

export function AddInteracaoDialog({
  leadId,
  decisores,
  interacao,
  open: openProp,
  onOpenChange,
}: Props) {
  const isEdit = !!interacao;
  const isControlled = openProp !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;
  function setOpen(o: boolean) {
    onOpenChange?.(o);
    if (!isControlled) setInternalOpen(o);
  }

  const [canal, setCanal] = useState<InteracaoCanal>(
    interacao?.canal ?? "whatsapp",
  );
  const [tipo, setTipo] = useState<InteracaoTipo>(
    interacao?.tipo ?? "envio_mensagem",
  );
  const [decisorId, setDecisorId] = useState<string>(
    interacao?.decisor_id ?? NONE,
  );
  const [dataHora, setDataHora] = useState<string>(
    interacao ? toDateTimeLocalBR(interacao.data_hora) : nowBRInputValue(),
  );
  const [resumo, setResumo] = useState(interacao?.resumo ?? "");
  const [pending, startTransition] = useTransition();

  // Volta aos valores originais (edição) ou aos defaults (criação).
  function reset() {
    setCanal(interacao?.canal ?? "whatsapp");
    setTipo(interacao?.tipo ?? "envio_mensagem");
    setDecisorId(interacao?.decisor_id ?? NONE);
    setDataHora(
      interacao ? toDateTimeLocalBR(interacao.data_hora) : nowBRInputValue(),
    );
    setResumo(interacao?.resumo ?? "");
  }

  function handleSubmit() {
    const fd = new FormData();
    fd.set("lead_id", leadId);
    if (decisorId !== NONE) fd.set("decisor_id", decisorId);
    fd.set("data_hora_br", dataHora);
    fd.set("canal", canal);
    fd.set("tipo", tipo);
    fd.set("resumo", resumo);

    startTransition(async () => {
      const res = isEdit
        ? await updateInteracaoAction(interacao!.id, fd)
        : await createInteracaoAction(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(isEdit ? "Interação atualizada" : "Interação registrada");
      if (!isEdit) reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !isEdit) setDataHora(nowBRInputValue());
        else if (!o) reset();
      }}
    >
      {isEdit ? null : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5" />
            Registrar interação
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar interação" : "Nova interação"}</DialogTitle>
          <DialogDescription>
            Registra mensagens, ligações, reuniões e notas. Data/hora em fuso BR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="canal" className="text-xs">
                Canal *
              </Label>
              <Select value={canal} onValueChange={(v) => setCanal(v as InteracaoCanal)}>
                <SelectTrigger id="canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERACAO_CANAL_LABELS) as InteracaoCanal[]).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {INTERACAO_CANAL_LABELS[c]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tipo" className="text-xs">
                Tipo *
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as InteracaoTipo)}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERACAO_TIPO_LABELS) as InteracaoTipo[]).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {INTERACAO_TIPO_LABELS[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {decisores.length > 0 ? (
            <div className="space-y-1">
              <Label htmlFor="decisor" className="text-xs">
                Decisor envolvido (opcional)
              </Label>
              <Select value={decisorId} onValueChange={setDecisorId}>
                <SelectTrigger id="decisor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Nenhum específico</SelectItem>
                  {decisores.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome} ({d.prioridade.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="data_hora" className="text-xs">
              Data/hora (BR) *
            </Label>
            <Input
              id="data_hora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="resumo" className="text-xs">
              Resumo *
            </Label>
            <Textarea
              id="resumo"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              rows={4}
              placeholder="O que aconteceu? Quem disse o quê?"
              maxLength={2000}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {resumo.length}/2000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !resumo.trim() || !dataHora}
          >
            {pending
              ? isEdit
                ? "Salvando…"
                : "Registrando…"
              : isEdit
                ? "Salvar"
                : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
