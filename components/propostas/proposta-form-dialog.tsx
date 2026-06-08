"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  PROPOSTA_STATUSES,
  PROPOSTA_STATUS_LABELS,
  type Proposta,
  type PropostaStatus,
} from "@/lib/database.types";
import {
  createPropostaAction,
  updatePropostaAction,
} from "@/lib/propostas/actions";
import { formatBRL } from "@/lib/format";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  mode: "create" | "edit";
  proposta?: Proposta;
  trigger?: React.ReactNode;
}

export function PropostaFormDialog({ mode, proposta, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [cliente, setCliente] = useState(proposta?.cliente ?? "");
  const [titulo, setTitulo] = useState(proposta?.titulo ?? "");
  const [descricao, setDescricao] = useState(proposta?.descricao ?? "");
  const [quantidade, setQuantidade] = useState(
    String(proposta?.quantidade ?? 1),
  );
  const [valorUnitario, setValorUnitario] = useState(
    proposta?.valor_unitario != null
      ? String(proposta.valor_unitario).replace(".", ",")
      : "",
  );
  const [status, setStatus] = useState<PropostaStatus>(
    proposta?.status ?? "aberto",
  );
  const [dataEnvio, setDataEnvio] = useState(
    proposta?.data_envio ?? todayISO(),
  );
  const [dataResposta, setDataResposta] = useState(
    proposta?.data_resposta ?? "",
  );
  const [motivoRecusa, setMotivoRecusa] = useState(
    proposta?.motivo_recusa ?? "",
  );
  const [observacoes, setObservacoes] = useState(proposta?.observacoes ?? "");

  useEffect(() => {
    if (open) {
      setCliente(proposta?.cliente ?? "");
      setTitulo(proposta?.titulo ?? "");
      setDescricao(proposta?.descricao ?? "");
      setQuantidade(String(proposta?.quantidade ?? 1));
      setValorUnitario(
        proposta?.valor_unitario != null
          ? String(proposta.valor_unitario).replace(".", ",")
          : "",
      );
      setStatus(proposta?.status ?? "aberto");
      setDataEnvio(proposta?.data_envio ?? todayISO());
      setDataResposta(proposta?.data_resposta ?? "");
      setMotivoRecusa(proposta?.motivo_recusa ?? "");
      setObservacoes(proposta?.observacoes ?? "");
    }
  }, [
    open,
    proposta?.id,
    proposta?.cliente,
    proposta?.titulo,
    proposta?.descricao,
    proposta?.quantidade,
    proposta?.valor_unitario,
    proposta?.status,
    proposta?.data_envio,
    proposta?.data_resposta,
    proposta?.motivo_recusa,
    proposta?.observacoes,
  ]);

  const total = useMemo(
    () => parseNum(quantidade) * parseNum(valorUnitario),
    [quantidade, valorUnitario],
  );

  const isRecusado = status === "recusado";

  function handleSubmit() {
    const fd = new FormData();
    fd.set("cliente", cliente);
    fd.set("titulo", titulo);
    fd.set("descricao", descricao);
    fd.set("quantidade", quantidade);
    fd.set("valor_unitario", valorUnitario);
    fd.set("status", status);
    fd.set("data_envio", dataEnvio);
    fd.set("data_resposta", dataResposta);
    fd.set("motivo_recusa", motivoRecusa);
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPropostaAction(fd)
          : await updatePropostaAction(proposta!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? "Proposta criada" : "Proposta atualizada");
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Nova proposta
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova proposta" : "Editar proposta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Registre uma proposta enviada ao cliente."
              : "Atualize os dados da proposta."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-data">Data de envio *</Label>
              <Input
                id="prop-data"
                type="date"
                value={dataEnvio}
                onChange={(e) => setDataEnvio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="prop-cliente">Cliente *</Label>
              <Input
                id="prop-cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente / empresa"
                maxLength={200}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-titulo">Título *</Label>
            <Input
              id="prop-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ex: Proposta 10 unidades HALO Ring"
              maxLength={200}
            />
          </div>

          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Valores
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-qtd">Quantidade *</Label>
                <Input
                  id="prop-qtd"
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-vu">Valor unitário *</Label>
                <Input
                  id="prop-vu"
                  inputMode="decimal"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="2.499,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor total</Label>
                <div className="h-9 rounded-md border border-input bg-primary/5 px-3 flex items-center font-mono text-sm text-primary">
                  {formatBRL(total)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-status">Status *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PropostaStatus)}
              >
                <SelectTrigger id="prop-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSTA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROPOSTA_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-resposta">Data de resposta</Label>
              <Input
                id="prop-resposta"
                type="date"
                value={dataResposta}
                onChange={(e) => setDataResposta(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-desc">Descrição</Label>
            <Textarea
              id="prop-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Detalhes da proposta, escopo, condições, prazos…"
            />
          </div>

          {isRecusado ? (
            <div className="space-y-1.5">
              <Label htmlFor="prop-motivo">Motivo da recusa</Label>
              <Textarea
                id="prop-motivo"
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Por que foi recusada? (preço, timing, fit…)"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="prop-obs">Observações</Label>
            <Textarea
              id="prop-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Anotações internas, próximos passos…"
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
              !cliente.trim() ||
              !titulo.trim() ||
              !dataEnvio ||
              parseNum(quantidade) <= 0 ||
              parseNum(valorUnitario) < 0
            }
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar proposta"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
