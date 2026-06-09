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
  PAGAMENTO_STATUSES,
  PAGAMENTO_STATUS_LABELS,
  PAGAMENTO_TIPOS,
  PAGAMENTO_TIPO_LABELS,
  type InfluencerPagamento,
  type PagamentoStatus,
  type PagamentoTipo,
} from "@/lib/database.types";
import {
  createPagamentoAction,
  updatePagamentoAction,
} from "@/lib/influencer-pagamentos/actions";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  mode: "create" | "edit";
  influencerId: string;
  pagamento?: InfluencerPagamento;
  trigger?: React.ReactNode;
}

export function PagamentoFormDialog({
  mode,
  influencerId,
  pagamento,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [tipo, setTipo] = useState<PagamentoTipo>(pagamento?.tipo ?? "permuta");
  const [valor, setValor] = useState(
    pagamento?.valor != null
      ? String(pagamento.valor).replace(".", ",")
      : "",
  );
  const [descricao, setDescricao] = useState(
    pagamento?.descricao_permuta ?? "",
  );
  const [dataCombinada, setDataCombinada] = useState(
    pagamento?.data_combinada ?? todayISO(),
  );
  const [dataPago, setDataPago] = useState(pagamento?.data_pago ?? "");
  const [status, setStatus] = useState<PagamentoStatus>(
    pagamento?.status ?? "pendente",
  );
  const [observacoes, setObservacoes] = useState(pagamento?.observacoes ?? "");

  useEffect(() => {
    if (!open) return;
    setTipo(pagamento?.tipo ?? "permuta");
    setValor(
      pagamento?.valor != null
        ? String(pagamento.valor).replace(".", ",")
        : "",
    );
    setDescricao(pagamento?.descricao_permuta ?? "");
    setDataCombinada(pagamento?.data_combinada ?? todayISO());
    setDataPago(pagamento?.data_pago ?? "");
    setStatus(pagamento?.status ?? "pendente");
    setObservacoes(pagamento?.observacoes ?? "");
  }, [open, pagamento]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("influencer_id", influencerId);
    fd.set("tipo", tipo);
    fd.set("valor", valor);
    fd.set("descricao_permuta", descricao);
    fd.set("data_combinada", dataCombinada);
    fd.set("data_pago", dataPago);
    fd.set("status", status);
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPagamentoAction(fd)
          : await updatePagamentoAction(pagamento!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        mode === "create" ? "Pagamento registrado" : "Pagamento atualizado",
      );
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm" variant="outline">
        <Plus className="h-3.5 w-3.5" />
        Novo pagamento
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  const requireValor = tipo === "pago";
  const requireDescricao = tipo === "permuta";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo pagamento" : "Editar pagamento"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Registre uma parcela de cachê (permuta ou R$)."
              : "Atualize o pagamento."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pag-tipo">Tipo *</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as PagamentoTipo)}
              >
                <SelectTrigger id="pag-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGAMENTO_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {PAGAMENTO_TIPO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pag-status">Status *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PagamentoStatus)}
              >
                <SelectTrigger id="pag-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGAMENTO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PAGAMENTO_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requireDescricao ? (
            <div className="space-y-1.5">
              <Label htmlFor="pag-desc">Descrição da permuta *</Label>
              <Textarea
                id="pag-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="ex: 1 HALO Ring tamanho M + 1 carregador"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pag-valor">
                Valor (R$) {requireValor ? "*" : ""}
              </Label>
              <Input
                id="pag-valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="1.500,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pag-comb">Data combinada *</Label>
              <Input
                id="pag-comb"
                type="date"
                value={dataCombinada}
                onChange={(e) => setDataCombinada(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pag-pago">Data pago</Label>
              <Input
                id="pag-pago"
                type="date"
                value={dataPago}
                onChange={(e) => setDataPago(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pag-obs">Observações</Label>
            <Textarea
              id="pag-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              maxLength={1000}
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
              !dataCombinada ||
              (requireDescricao && !descricao.trim()) ||
              (requireValor && (!valor || valor.trim() === ""))
            }
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Registrar"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
