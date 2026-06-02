"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRightCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  VENDA_RESPONSAVEIS,
  VENDA_RESPONSAVEL_LABELS,
  type Proposta,
  type VendaResponsavel,
} from "@/lib/database.types";
import { convertPropostaToVendaAction } from "@/lib/propostas/actions";
import { formatBRL } from "@/lib/financeiro/format";

interface Props {
  proposta: Proposta;
}

export function ConvertToVendaDialog({ proposta }: Props) {
  const [open, setOpen] = useState(false);
  const [responsavel, setResponsavel] = useState<VendaResponsavel>("gabriel");
  const [comissao, setComissao] = useState("10");
  const [pending, startTransition] = useTransition();

  // Reset on open
  useEffect(() => {
    if (open) {
      setResponsavel("gabriel");
      setComissao("10");
    }
  }, [open]);

  const liquidoEstimado = proposta.valor_total;
  const pctNum = parseFloat(comissao.replace(",", ".")) || 0;
  const comissaoEstimada = (liquidoEstimado * pctNum) / 100;

  function handleConvert() {
    startTransition(async () => {
      const res = await convertPropostaToVendaAction(
        proposta.id,
        responsavel,
        comissao,
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Proposta convertida em venda.", {
        action: {
          label: "Ver Financeiro",
          onClick: () => {
            window.location.href = "/financeiro";
          },
        },
      });
      setOpen(false);
    });
  }

  // Se já convertida, render apenas um link informativo
  if (proposta.status === "convertido") {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/financeiro" className="text-emerald-300">
          <ArrowRightCircle className="h-3.5 w-3.5" />
          Já convertida — Ver no Financeiro
        </Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ArrowRightCircle className="h-3.5 w-3.5" />
          Converter em venda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Converter em venda</DialogTitle>
          <DialogDescription>
            Vai criar uma venda nova no Financeiro com os dados desta
            proposta. Status inicial: pendente.
          </DialogDescription>
        </DialogHeader>

        {/* Preview do que será criado */}
        <div className="rounded-md border border-white/10 bg-card/40 p-3 space-y-2 text-sm">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Resumo
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium truncate">{proposta.cliente}</span>
            <span className="text-muted-foreground">Quantidade:</span>
            <span className="font-mono">{proposta.quantidade}</span>
            <span className="text-muted-foreground">Valor unitário:</span>
            <span className="font-mono">
              {formatBRL(proposta.valor_unitario)}
            </span>
            <span className="text-muted-foreground">Valor total:</span>
            <span className="font-mono text-primary">
              {formatBRL(proposta.valor_total)}
            </span>
          </div>
        </div>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="conv-resp">Responsável *</Label>
              <Select
                value={responsavel}
                onValueChange={(v) => setResponsavel(v as VendaResponsavel)}
              >
                <SelectTrigger id="conv-resp">
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
              <Label htmlFor="conv-com">Comissão %</Label>
              <Input
                id="conv-com"
                inputMode="decimal"
                value={comissao}
                onChange={(e) => setComissao(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Comissão estimada:{" "}
            <span className="font-mono text-foreground">
              {formatBRL(comissaoEstimada)}
            </span>
          </p>
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
          <Button type="button" onClick={handleConvert} disabled={pending}>
            {pending ? "Convertendo…" : "Confirmar conversão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
