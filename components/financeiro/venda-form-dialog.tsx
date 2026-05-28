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
  VENDA_CANAIS_PAGAMENTO,
  VENDA_CANAL_PAGAMENTO_LABELS,
  VENDA_RESPONSAVEIS,
  VENDA_RESPONSAVEL_LABELS,
  VENDA_STATUSES,
  VENDA_STATUS_LABELS,
  type Venda,
  type VendaCanalPagamento,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";
import {
  createVendaAction,
  updateVendaAction,
} from "@/lib/financeiro/actions";
import { formatBRL } from "@/lib/financeiro/format";

const NONE = "_none_";

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
  venda?: Venda;
  trigger?: React.ReactNode;
}

export function VendaFormDialog({ mode, venda, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [dataVenda, setDataVenda] = useState(venda?.data_venda ?? todayISO());
  const [cliente, setCliente] = useState(venda?.cliente ?? "");
  const [quantidade, setQuantidade] = useState(String(venda?.quantidade ?? 1));
  const [valorUnitario, setValorUnitario] = useState(
    venda?.valor_unitario != null
      ? String(venda.valor_unitario).replace(".", ",")
      : "",
  );
  const [desconto, setDesconto] = useState(
    venda?.desconto != null && venda.desconto > 0
      ? String(venda.desconto).replace(".", ",")
      : "",
  );
  const [responsavel, setResponsavel] = useState<VendaResponsavel>(
    venda?.responsavel ?? "gabriel",
  );
  const [comissaoPct, setComissaoPct] = useState(
    String(venda?.comissao_percentual ?? 10).replace(".", ","),
  );
  const [comissaoPaga, setComissaoPaga] = useState(
    Boolean(venda?.comissao_paga),
  );
  const [canalPagamento, setCanalPagamento] = useState<string>(
    venda?.canal_pagamento ?? NONE,
  );
  const [status, setStatus] = useState<VendaStatus>(
    venda?.status ?? "pendente",
  );
  const [dataPagamento, setDataPagamento] = useState(
    venda?.data_pagamento ?? "",
  );
  const [observacoes, setObservacoes] = useState(venda?.observacoes ?? "");

  // Sincroniza props no open (mesmo padrão dos outros form dialogs).
  useEffect(() => {
    if (open) {
      setDataVenda(venda?.data_venda ?? todayISO());
      setCliente(venda?.cliente ?? "");
      setQuantidade(String(venda?.quantidade ?? 1));
      setValorUnitario(
        venda?.valor_unitario != null
          ? String(venda.valor_unitario).replace(".", ",")
          : "",
      );
      setDesconto(
        venda?.desconto != null && venda.desconto > 0
          ? String(venda.desconto).replace(".", ",")
          : "",
      );
      setResponsavel(venda?.responsavel ?? "gabriel");
      setComissaoPct(String(venda?.comissao_percentual ?? 10).replace(".", ","));
      setComissaoPaga(Boolean(venda?.comissao_paga));
      setCanalPagamento(venda?.canal_pagamento ?? NONE);
      setStatus(venda?.status ?? "pendente");
      setDataPagamento(venda?.data_pagamento ?? "");
      setObservacoes(venda?.observacoes ?? "");
    }
  }, [
    open,
    venda?.id,
    venda?.data_venda,
    venda?.cliente,
    venda?.quantidade,
    venda?.valor_unitario,
    venda?.desconto,
    venda?.responsavel,
    venda?.comissao_percentual,
    venda?.comissao_paga,
    venda?.canal_pagamento,
    venda?.status,
    venda?.data_pagamento,
    venda?.observacoes,
  ]);

  // Cálculos derivados em tempo real
  const calc = useMemo(() => {
    const qtd = parseNum(quantidade);
    const vu = parseNum(valorUnitario);
    const desc = parseNum(desconto);
    const pct = parseNum(comissaoPct);
    const bruto = qtd * vu;
    const liquido = Math.max(0, bruto - desc);
    const comissao = (liquido * pct) / 100;
    return { bruto, liquido, comissao };
  }, [quantidade, valorUnitario, desconto, comissaoPct]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("data_venda", dataVenda);
    fd.set("cliente", cliente);
    fd.set("quantidade", quantidade);
    fd.set("valor_unitario", valorUnitario);
    fd.set("desconto", desconto || "0");
    fd.set("responsavel", responsavel);
    fd.set("comissao_percentual", comissaoPct);
    if (comissaoPaga) fd.set("comissao_paga", "on");
    fd.set(
      "canal_pagamento",
      canalPagamento === NONE ? "" : canalPagamento,
    );
    fd.set("status", status);
    fd.set("data_pagamento", dataPagamento);
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createVendaAction(fd)
          : await updateVendaAction(venda!.id, fd);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova venda" : "Editar venda"}
          </DialogTitle>
          <DialogDescription>
            Bruto, líquido e comissão são calculados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Linha 1: data + cliente */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="venda-data">Data *</Label>
              <Input
                id="venda-data"
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="venda-cliente">Cliente *</Label>
              <Input
                id="venda-cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome da empresa ou pessoa"
                maxLength={200}
                autoFocus
              />
            </div>
          </div>

          {/* Linha 2: produto */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Produto
            </p>
            <div className="grid grid-cols-3 gap-3">
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
              <div className="space-y-1.5">
                <Label htmlFor="venda-vu">Valor unitário *</Label>
                <Input
                  id="venda-vu"
                  inputMode="decimal"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="2.499,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venda-desc">Desconto</Label>
                <Input
                  id="venda-desc"
                  inputMode="decimal"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-md bg-muted/30 p-2 text-xs">
                <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  Bruto
                </p>
                <p className="font-mono text-sm">{formatBRL(calc.bruto)}</p>
              </div>
              <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-xs">
                <p className="text-primary uppercase tracking-wide text-[10px]">
                  Líquido
                </p>
                <p className="font-mono text-sm text-primary">
                  {formatBRL(calc.liquido)}
                </p>
              </div>
            </div>
          </div>

          {/* Linha 3: comissão */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Comissão & Responsável
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="venda-resp">Responsável *</Label>
                <Select
                  value={responsavel}
                  onValueChange={(v) => setResponsavel(v as VendaResponsavel)}
                >
                  <SelectTrigger id="venda-resp">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDA_RESPONSAVEIS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {VENDA_RESPONSAVEL_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venda-pct">Comissão %</Label>
                <Input
                  id="venda-pct"
                  inputMode="decimal"
                  value={comissaoPct}
                  onChange={(e) => setComissaoPct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor calculado</Label>
                <div className="h-9 rounded-md border border-input bg-transparent px-3 flex items-center font-mono text-sm">
                  {formatBRL(calc.comissao)}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={comissaoPaga}
                onChange={(e) => setComissaoPaga(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-xs">Comissão já foi paga</span>
            </label>
          </div>

          {/* Linha 4: pagamento */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Pagamento
            </p>
            <div className="grid grid-cols-3 gap-3">
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
                <Label htmlFor="venda-canal">Canal</Label>
                <Select
                  value={canalPagamento}
                  onValueChange={setCanalPagamento}
                >
                  <SelectTrigger id="venda-canal">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Não definido</SelectItem>
                    {VENDA_CANAIS_PAGAMENTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {VENDA_CANAL_PAGAMENTO_LABELS[c as VendaCanalPagamento]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venda-dp">Data do pagamento</Label>
                <Input
                  id="venda-dp"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="venda-obs">Observações</Label>
            <Textarea
              id="venda-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Contexto, condições especiais, etc."
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
              !dataVenda ||
              parseNum(quantidade) <= 0 ||
              parseNum(valorUnitario) < 0
            }
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Registrar venda"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
