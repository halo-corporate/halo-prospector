"use client";

import { useState, useTransition } from "react";
import { Calculator, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calcularFreteAction,
  type CotacaoFreteInput,
} from "@/lib/melhor-envio/actions";
import type {
  CotacaoOpcao,
  CotacaoIndisponivel,
} from "@/lib/melhor-envio/shipping";

interface Props {
  conectado: boolean;
  fromCepDefault: string;
  /** Valores atuais do form (strings cruas dos inputs). */
  destinoCep: string;
  pesoG: string;
  altura: string;
  largura: string;
  comprimento: string;
  /** Preenche transportadora/serviço/valor ao escolher uma opção. */
  onSelect: (opcao: { transportadora: string; servico: string; valor: number }) => void;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CotacaoFrete({
  conectado,
  fromCepDefault,
  destinoCep,
  pesoG,
  altura,
  largura,
  comprimento,
  onSelect,
}: Props) {
  const [origemCep, setOrigemCep] = useState(fromCepDefault);
  const [opcoes, setOpcoes] = useState<CotacaoOpcao[] | null>(null);
  const [indisponiveis, setIndisponiveis] = useState<CotacaoIndisponivel[]>([]);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  if (!conectado) {
    return (
      <p className="text-xs text-muted-foreground">
        Conecte o Melhor Envio (card acima) pra cotar o frete automaticamente.
      </p>
    );
  }

  function cotar() {
    const input: CotacaoFreteInput = {
      fromCep: origemCep,
      toCep: destinoCep,
      pesoG: Number(pesoG),
      alturaCm: Number(altura),
      larguraCm: Number(largura),
      comprimentoCm: Number(comprimento),
    };
    startTransition(async () => {
      const res = await calcularFreteAction(input);
      if (!res.ok) {
        setOpcoes(null);
        setIndisponiveis([]);
        toast.error(res.message);
        return;
      }
      setOpcoes(res.opcoes);
      setIndisponiveis(res.indisponiveis);
      setSelecionado(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="cot-origem">CEP de origem</Label>
          <Input
            id="cot-origem"
            value={origemCep}
            onChange={(e) => setOrigemCep(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="w-36"
          />
        </div>
        <Button type="button" variant="outline" onClick={cotar} disabled={pending}>
          <Calculator className="h-3.5 w-3.5" />
          {pending ? "Cotando…" : "Cotar frete"}
        </Button>
      </div>

      {opcoes && opcoes.length > 0 ? (
        <div className="rounded-md border border-white/10 divide-y divide-white/5">
          {opcoes.map((o) => {
            const ativo = selecionado === o.servicoId;
            return (
              <button
                key={o.servicoId}
                type="button"
                onClick={() => {
                  setSelecionado(o.servicoId);
                  onSelect({
                    transportadora: o.transportadora,
                    servico: o.servico,
                    valor: o.valor,
                  });
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  ativo ? "bg-primary/10" : ""
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {ativo ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    <span className="font-medium">{o.transportadora}</span>{" "}
                    <span className="text-muted-foreground">{o.servico}</span>
                    {o.prazoDias != null ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {o.prazoDias} {o.prazoDias === 1 ? "dia" : "dias"}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="font-display font-bold tabular-nums shrink-0">
                  {fmtBRL(o.valor)}
                </span>
              </button>
            );
          })}
        </div>
      ) : opcoes && opcoes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma transportadora retornou preço pra esse trajeto/pacote.
        </p>
      ) : null}

      {indisponiveis.length > 0 ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {indisponiveis.length}{" "}
            {indisponiveis.length === 1
              ? "transportadora indisponível"
              : "transportadoras indisponíveis"}{" "}
            (ver motivo)
          </summary>
          <ul className="mt-2 space-y-1 pl-1">
            {indisponiveis.map((i, idx) => (
              <li key={`${i.transportadora}-${i.servico}-${idx}`}>
                <span className="font-medium">{i.transportadora}</span> {i.servico}
                {" — "}
                <span className="text-amber-400/80">{i.motivo}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
