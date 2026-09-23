"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  gerarEtiquetaAction,
  rebaixarEtiquetaAction,
} from "@/lib/melhor-envio/actions";

interface Props {
  envioId: string;
  /** null = pode gerar; texto = motivo do bloqueio (mostra desabilitado). */
  disabledReason: string | null;
  /** Já existe pedido no Melhor Envio — não gerar de novo. */
  jaGerada: boolean;
  /** Já tem o PDF da etiqueta no sistema (bucket). */
  temPdf: boolean;
  /** Sugestão de valor declarado (R$) pro seguro. */
  valorSugerido?: number | null;
}

export function GerarEtiqueta({
  envioId,
  disabledReason,
  jaGerada,
  temPdf,
  valorSugerido,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(
    valorSugerido && valorSugerido > 0 ? String(valorSugerido) : "",
  );

  function handleRebaixar() {
    startTransition(async () => {
      const res = await rebaixarEtiquetaAction(envioId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Etiqueta baixada do Melhor Envio!");
      router.refresh();
    });
  }

  if (jaGerada) {
    // Pedido já existe no Melhor Envio (e já foi pago). Se o PDF ainda não veio
    // pro sistema, dá pra re-puxar SEM cobrar de novo (só print, sem checkout).
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Etiqueta já gerada no Melhor Envio. Para gerar de novo, cancele o
          pedido no painel do Melhor Envio.
        </p>
        {!temPdf ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRebaixar}
            disabled={pending}
          >
            <Download className="h-3.5 w-3.5" />
            {pending ? "Baixando…" : "Baixar etiqueta do Melhor Envio"}
          </Button>
        ) : null}
      </div>
    );
  }

  function handleGerar() {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Informe um valor declarado válido pro seguro.");
      return;
    }
    startTransition(async () => {
      const res = await gerarEtiquetaAction(envioId, v);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Etiqueta gerada! Pedido " + res.orderId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(disabledReason)}
          title={disabledReason ?? undefined}
        >
          <Tag className="h-3.5 w-3.5" />
          Gerar etiqueta (Melhor Envio)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar etiqueta no Melhor Envio</DialogTitle>
          <DialogDescription>
            Isto compra a etiqueta e <strong>debita o saldo</strong> da sua
            conta do Melhor Envio. Confira os dados antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90">
              Ação irreversível e que cobra. O frete será cotado ao vivo no
              momento da geração — o valor pode diferir levemente da última
              cotação salva.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="etq-valor">Valor declarado (seguro) — R$ *</Label>
            <Input
              id="etq-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex.: 250,00"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Valor do conteúdo pro seguro do envio.
            </p>
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
          <Button type="button" onClick={handleGerar} disabled={pending}>
            <Tag className="h-3.5 w-3.5" />
            {pending ? "Gerando…" : "Confirmar e comprar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
