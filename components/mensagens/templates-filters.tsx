"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MultiSelectChips,
  type MultiSelectOption,
} from "@/components/ui/multi-select-chips";
import {
  LEAD_STATUS_LABELS,
  MENSAGEM_CANAIS,
  MENSAGEM_CANAL_LABELS,
  type LeadStatus,
  type MensagemCanal,
} from "@/lib/database.types";

interface Props {
  defaults: {
    canais?: MensagemCanal[];
    etapas?: string[];
    q?: string;
  };
  /** Etapas distintas presentes no banco — pra alimentar opções extras. */
  etapasExtras: string[];
}

const CANAL_OPTIONS: MultiSelectOption[] = MENSAGEM_CANAIS.map((c) => ({
  value: c,
  label: MENSAGEM_CANAL_LABELS[c],
}));

export function TemplatesFilters({ defaults, etapasExtras }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [clearTick, setClearTick] = useState(0);

  function setMultiParam(key: string, values: string[]) {
    const next = new URLSearchParams(params.toString());
    if (values.length === 0) next.delete(key);
    else next.set(key, values.join(","));
    startTransition(() => {
      router.push(`/mensagens?${next.toString()}`);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(params.toString());
    const q = ((fd.get("q") as string | null) ?? "").trim();
    if (q) next.set("q", q);
    else next.delete("q");
    startTransition(() => {
      router.push(`/mensagens?${next.toString()}`);
    });
  }

  function clear() {
    formRef.current?.reset();
    setClearTick((t) => t + 1);
    startTransition(() => router.push("/mensagens"));
  }

  const hasAny =
    (defaults.canais && defaults.canais.length > 0) ||
    (defaults.etapas && defaults.etapas.length > 0) ||
    !!defaults.q;

  // Etapas conhecidas = lead_status + extras do banco que não estão no enum
  const knownEtapas = new Set(Object.keys(LEAD_STATUS_LABELS));
  const extras = etapasExtras.filter((e) => !knownEtapas.has(e));
  const ETAPA_OPTIONS: MultiSelectOption[] = [
    ...(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => ({
      value: s,
      label: LEAD_STATUS_LABELS[s],
    })),
    ...extras.map((e) => ({ value: e, label: e.replace(/_/g, " ") })),
  ];

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="halo-glass rounded-halo p-3 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
        <Input
          key={`q-${defaults.q ?? ""}-${clearTick}`}
          name="q"
          placeholder="Buscar título…"
          defaultValue={defaults.q ?? ""}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Filtrando…" : "Aplicar"}
          </Button>
          {hasAny ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clear}
              disabled={pending}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Canais
          </Label>
          <MultiSelectChips
            options={CANAL_OPTIONS}
            value={defaults.canais ?? []}
            onChange={(v) => setMultiParam("canal", v)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Etapas
          </Label>
          <MultiSelectChips
            options={ETAPA_OPTIONS}
            value={defaults.etapas ?? []}
            onChange={(v) => setMultiParam("etapa", v)}
          />
        </div>
      </div>
    </form>
  );
}
