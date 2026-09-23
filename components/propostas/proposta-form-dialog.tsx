"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Pencil, Plus, Sparkles } from "lucide-react";
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
  PROPOSTA_VERTICAIS,
  PROPOSTA_VERTICAL_LABELS,
  type Proposta,
  type PropostaStatus,
} from "@/lib/database.types";
import {
  createPropostaAction,
  updatePropostaAction,
} from "@/lib/propostas/actions";
import {
  HALO_RING_PRECO_UNITARIO,
  descontoPorQuantidade,
} from "@/lib/propostas/desconto";
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

/** Formata um número (ex. 447.9) no padrão BR de input ("447,90"). */
function numToInput(n: number): string {
  return String(n).replace(".", ",");
}

interface Props {
  mode: "create" | "edit";
  proposta?: Proposta;
  trigger?: React.ReactNode;
}

export function PropostaFormDialog({ mode, proposta, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const precoTabelaInput = numToInput(HALO_RING_PRECO_UNITARIO);

  const [cliente, setCliente] = useState(proposta?.cliente ?? "");
  const [titulo, setTitulo] = useState(proposta?.titulo ?? "");
  const [vertical, setVertical] = useState<string>(proposta?.vertical ?? "");
  const [descricao, setDescricao] = useState(proposta?.descricao ?? "");
  const [quantidade, setQuantidade] = useState(
    String(proposta?.quantidade ?? 1),
  );
  const [valorUnitario, setValorUnitario] = useState(
    proposta?.valor_unitario != null
      ? numToInput(proposta.valor_unitario)
      : precoTabelaInput,
  );
  const [descontoPercentual, setDescontoPercentual] = useState(
    proposta?.desconto_percentual != null
      ? numToInput(proposta.desconto_percentual)
      : "0",
  );
  const [condicaoEspecial, setCondicaoEspecial] = useState(
    proposta?.condicao_especial ??
      descontoPorQuantidade(proposta?.quantidade ?? 1) === null,
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
  const [obsPdf, setObsPdf] = useState(proposta?.obs_pdf ?? "");
  const [obsInterna, setObsInterna] = useState(proposta?.obs_interna ?? "");

  useEffect(() => {
    if (open) {
      setCliente(proposta?.cliente ?? "");
      setTitulo(proposta?.titulo ?? "");
      setVertical(proposta?.vertical ?? "");
      setDescricao(proposta?.descricao ?? "");
      setQuantidade(String(proposta?.quantidade ?? 1));
      setValorUnitario(
        proposta?.valor_unitario != null
          ? numToInput(proposta.valor_unitario)
          : precoTabelaInput,
      );
      setDescontoPercentual(
        proposta?.desconto_percentual != null
          ? numToInput(proposta.desconto_percentual)
          : "0",
      );
      setCondicaoEspecial(
        proposta?.condicao_especial ??
          descontoPorQuantidade(proposta?.quantidade ?? 1) === null,
      );
      setStatus(proposta?.status ?? "aberto");
      setDataEnvio(proposta?.data_envio ?? todayISO());
      setDataResposta(proposta?.data_resposta ?? "");
      setMotivoRecusa(proposta?.motivo_recusa ?? "");
      setObsPdf(proposta?.obs_pdf ?? "");
      setObsInterna(proposta?.obs_interna ?? "");
    }
  }, [
    open,
    precoTabelaInput,
    proposta?.id,
    proposta?.cliente,
    proposta?.titulo,
    proposta?.vertical,
    proposta?.descricao,
    proposta?.quantidade,
    proposta?.valor_unitario,
    proposta?.desconto_percentual,
    proposta?.condicao_especial,
    proposta?.status,
    proposta?.data_envio,
    proposta?.data_resposta,
    proposta?.motivo_recusa,
    proposta?.obs_pdf,
    proposta?.obs_interna,
  ]);

  // Ao mudar a quantidade, sugere o desconto da faixa (editável). Abaixo de
  // 10 unidades sai da tabela progressiva -> condição especial, desconto livre.
  function handleQuantidadeChange(value: string) {
    setQuantidade(value);
    const qtd = parseInt(value, 10);
    const faixa = descontoPorQuantidade(Number.isFinite(qtd) ? qtd : 0);
    if (faixa === null) {
      setCondicaoEspecial(true);
    } else {
      setCondicaoEspecial(false);
      setDescontoPercentual(String(faixa));
    }
  }

  // Preview ao vivo (só visual — quem grava o líquido é a coluna gerada).
  const { bruto, descontoValor, liquido } = useMemo(() => {
    const qtd = parseNum(quantidade);
    const unit = parseNum(valorUnitario);
    const pct = parseNum(descontoPercentual);
    const b = qtd * unit;
    const d = b * (pct / 100);
    return { bruto: b, descontoValor: d, liquido: b - d };
  }, [quantidade, valorUnitario, descontoPercentual]);

  const isRecusado = status === "recusado";

  function handleSubmit() {
    const fd = new FormData();
    fd.set("cliente", cliente);
    fd.set("titulo", titulo);
    fd.set("vertical", vertical);
    fd.set("descricao", descricao);
    fd.set("quantidade", quantidade);
    fd.set("valor_unitario", valorUnitario);
    fd.set("desconto_percentual", descontoPercentual);
    fd.set("condicao_especial", condicaoEspecial ? "true" : "false");
    fd.set("status", status);
    fd.set("data_envio", dataEnvio);
    fd.set("data_resposta", dataResposta);
    fd.set("motivo_recusa", motivoRecusa);
    fd.set("obs_pdf", obsPdf);
    fd.set("obs_interna", obsInterna);

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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="prop-titulo">Título *</Label>
              <Input
                id="prop-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ex: Proposta 50 anéis HALO"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-vertical">Vertical</Label>
              <Select
                value={vertical}
                onValueChange={(v) => setVertical(v)}
              >
                <SelectTrigger id="prop-vertical">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSTA_VERTICAIS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {PROPOSTA_VERTICAL_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Anéis & desconto
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-qtd">Qtd. de anéis *</Label>
                <Input
                  id="prop-qtd"
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => handleQuantidadeChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-vu">Preço unitário *</Label>
                <Input
                  id="prop-vu"
                  inputMode="decimal"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder={precoTabelaInput}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-desc-pct">Desconto (%) *</Label>
                <Input
                  id="prop-desc-pct"
                  inputMode="decimal"
                  value={descontoPercentual}
                  onChange={(e) => setDescontoPercentual(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {condicaoEspecial ? (
              <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Condição especial.</strong> Abaixo de 10 anéis sai da
                  tabela progressiva — defina o desconto manualmente.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Desconto sugerido pela faixa de volume. Você pode sobrescrever o
                valor.
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Bruto
                </p>
                <p className="font-mono text-sm">{formatBRL(bruto)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Desconto
                </p>
                <p className="font-mono text-sm text-destructive">
                  − {formatBRL(descontoValor)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Líquido
                </p>
                <p className="font-mono text-sm font-semibold text-primary">
                  {formatBRL(liquido)}
                </p>
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
            <Label htmlFor="prop-obs-pdf">
              Observações no PDF — aparece pro cliente
            </Label>
            <Textarea
              id="prop-obs-pdf"
              value={obsPdf}
              onChange={(e) => setObsPdf(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Condições, prazos de entrega, formas de pagamento…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-obs-int">
              Observações internas — não vai no PDF
            </Label>
            <Textarea
              id="prop-obs-int"
              value={obsInterna}
              onChange={(e) => setObsInterna(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Anotações internas, próximos passos…"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {mode === "edit" && proposta ? (
            <Button asChild variant="outline">
              <Link
                href={`/proposta/${proposta.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-3.5 w-3.5" />
                Gerar PDF
              </Link>
            </Button>
          ) : (
            <span />
          )}
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
              !titulo.trim() ||
              !dataEnvio ||
              parseNum(quantidade) <= 0 ||
              parseNum(valorUnitario) < 0 ||
              parseNum(descontoPercentual) < 0 ||
              parseNum(descontoPercentual) > 100
            }
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar proposta"
                : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
