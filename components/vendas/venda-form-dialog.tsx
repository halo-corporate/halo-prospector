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
  VENDA_STATUSES,
  VENDA_STATUS_LABELS,
  VENDA_CANAIS_PAGAMENTO,
  VENDA_CANAL_PAGAMENTO_LABELS,
  type Venda,
  type VendaCanalPagamento,
  type VendaStatus,
} from "@/lib/database.types";
import { createVenda, updateVenda, type VendaInput } from "@/lib/vendas/actions";
import { formatBRL } from "@/lib/format";

// Sentinela pro "sem canal" (Radix Select não aceita value vazio).
const CANAL_NENHUM = "__none__";

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

/** Formata um número (ex. 447.9) no padrão BR de input ("447,90"). */
function numToInput(n: number): string {
  return String(n).replace(".", ",");
}

interface Props {
  mode: "create" | "edit";
  venda?: Venda;
  trigger?: React.ReactNode;
}

export function VendaFormDialog({ mode, venda, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [cliente, setCliente] = useState(venda?.cliente ?? "");
  const [valorUnitario, setValorUnitario] = useState(
    venda?.valor_unitario != null ? numToInput(venda.valor_unitario) : "",
  );
  const [quantidade, setQuantidade] = useState(String(venda?.quantidade ?? 1));
  const [status, setStatus] = useState<VendaStatus>(venda?.status ?? "pendente");
  const [canal, setCanal] = useState<string>(
    venda?.canal_pagamento ?? CANAL_NENHUM,
  );
  const [dataVenda, setDataVenda] = useState(venda?.data_venda ?? todayISO());
  const [observacoes, setObservacoes] = useState(venda?.observacoes ?? "");

  useEffect(() => {
    if (open) {
      setCliente(venda?.cliente ?? "");
      setValorUnitario(
        venda?.valor_unitario != null ? numToInput(venda.valor_unitario) : "",
      );
      setQuantidade(String(venda?.quantidade ?? 1));
      setStatus(venda?.status ?? "pendente");
      setCanal(venda?.canal_pagamento ?? CANAL_NENHUM);
      setDataVenda(venda?.data_venda ?? todayISO());
      setObservacoes(venda?.observacoes ?? "");
    }
  }, [
    open,
    venda?.id,
    venda?.cliente,
    venda?.valor_unitario,
    venda?.quantidade,
    venda?.status,
    venda?.canal_pagamento,
    venda?.data_venda,
    venda?.observacoes,
  ]);

  // Preview do total (só visual — quem grava o líquido é a coluna gerada).
  const total = useMemo(() => {
    const qtd = parseInt(quantidade, 10);
    return (Number.isFinite(qtd) ? qtd : 0) * parseNum(valorUnitario);
  }, [quantidade, valorUnitario]);

  function handleSubmit() {
    const input: VendaInput = {
      cliente: cliente.trim(),
      valor_unitario: parseNum(valorUnitario),
      quantidade: parseInt(quantidade, 10) || 0,
      status,
      canal_pagamento:
        canal === CANAL_NENHUM ? null : (canal as VendaCanalPagamento),
      data_venda: dataVenda || undefined,
      observacoes: observacoes.trim() || null,
    };

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createVenda(input)
          : await updateVenda(venda!.id, input);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? "Venda registrada" : "Venda atualizada");
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Nova venda
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova venda" : "Editar venda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Registre uma venda fechada."
              : "Atualize os dados da venda."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="venda-cliente">Cliente *</Label>
            <Input
              id="venda-cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="venda-vu">Valor unitário (R$) *</Label>
              <Input
                id="venda-vu"
                inputMode="decimal"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venda-qtd">Quantidade *</Label>
              <Input
                id="venda-qtd"
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Total:{" "}
            <span className="font-mono text-sm text-primary">
              {formatBRL(total)}
            </span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="venda-status">Status *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as VendaStatus)}
              >
                <SelectTrigger id="venda-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {VENDA_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venda-canal">Canal de pagamento</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger id="venda-canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CANAL_NENHUM}>—</SelectItem>
                  {VENDA_CANAIS_PAGAMENTO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {VENDA_CANAL_PAGAMENTO_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venda-data">Data da venda *</Label>
            <Input
              id="venda-data"
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venda-obs">Observações</Label>
            <Textarea
              id="venda-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
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
                !dataVenda ||
                parseInt(quantidade, 10) <= 0 ||
                parseNum(valorUnitario) < 0
              }
            >
              {pending
                ? "Salvando…"
                : mode === "create"
                  ? "Registrar venda"
                  : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
