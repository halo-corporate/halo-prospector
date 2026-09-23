"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
import type { InfluencerVenda } from "@/lib/database.types";
import {
  createVendaAction,
  updateVendaAction,
} from "@/lib/influencer-vendas/actions";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  mode: "create" | "edit";
  influencerId: string;
  venda?: InfluencerVenda;
  trigger?: React.ReactNode;
}

export function VendaFormDialog({ mode, influencerId, venda, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [dataVenda, setDataVenda] = useState(venda?.data_venda ?? todayISO());
  const [quantidade, setQuantidade] = useState(
    venda?.quantidade != null ? String(venda.quantidade) : "1",
  );
  const [valorTotal, setValorTotal] = useState(
    venda?.valor_total != null
      ? String(venda.valor_total).replace(".", ",")
      : "",
  );
  const [compradorNome, setCompradorNome] = useState(
    venda?.comprador_nome ?? "",
  );
  const [observacoes, setObservacoes] = useState(venda?.observacoes ?? "");

  useEffect(() => {
    if (!open) return;
    setDataVenda(venda?.data_venda ?? todayISO());
    setQuantidade(venda?.quantidade != null ? String(venda.quantidade) : "1");
    setValorTotal(
      venda?.valor_total != null
        ? String(venda.valor_total).replace(".", ",")
        : "",
    );
    setCompradorNome(venda?.comprador_nome ?? "");
    setObservacoes(venda?.observacoes ?? "");
  }, [open, venda]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("influencer_id", influencerId);
    fd.set("data_venda", dataVenda);
    fd.set("quantidade", quantidade);
    fd.set("valor_total", valorTotal);
    fd.set("comprador_nome", compradorNome);
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
      toast.success(
        mode === "create" ? "Venda registrada" : "Venda atualizada",
      );
      router.refresh();
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm" variant="outline">
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova venda" : "Editar venda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Registre uma venda gerada pelo código promocional."
              : "Atualize os dados da venda."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="venda-qtd">Quantidade *</Label>
              <Input
                id="venda-qtd"
                type="number"
                min={1}
                max={999}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venda-valor">Valor total (R$) *</Label>
            <Input
              id="venda-valor"
              inputMode="decimal"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="1.500,00"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venda-comprador">Comprador</Label>
            <Input
              id="venda-comprador"
              value={compradorNome}
              onChange={(e) => setCompradorNome(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venda-obs">Observações</Label>
            <Textarea
              id="venda-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Tamanho, cor, canal, etc."
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
              !dataVenda ||
              !quantidade ||
              !valorTotal ||
              valorTotal.trim() === ""
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
