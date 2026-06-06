"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPOSTA_STATUSES,
  PROPOSTA_STATUS_LABELS,
  type PropostaStatus,
} from "@/lib/database.types";

const ANY = "_any_";

interface Props {
  defaults: {
    status?: PropostaStatus;
    q?: string;
    valorMin?: string;
    valorMax?: string;
    dataInicio?: string;
    dataFim?: string;
  };
}

export function PropostasFilters({ defaults }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [clearTick, setClearTick] = useState(0);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`/propostas?${next.toString()}`));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(params.toString());

    const q = ((fd.get("q") as string | null) ?? "").trim();
    const vMin = ((fd.get("valor_min") as string | null) ?? "").trim();
    const vMax = ((fd.get("valor_max") as string | null) ?? "").trim();
    const dIni = ((fd.get("data_inicio") as string | null) ?? "").trim();
    const dFim = ((fd.get("data_fim") as string | null) ?? "").trim();

    if (q) next.set("q", q);
    else next.delete("q");
    if (vMin) next.set("valor_min", vMin);
    else next.delete("valor_min");
    if (vMax) next.set("valor_max", vMax);
    else next.delete("valor_max");
    if (dIni) next.set("data_inicio", dIni);
    else next.delete("data_inicio");
    if (dFim) next.set("data_fim", dFim);
    else next.delete("data_fim");

    startTransition(() => router.push(`/propostas?${next.toString()}`));
  }

  function clear() {
    formRef.current?.reset();
    setClearTick((t) => t + 1);
    startTransition(() => router.push("/propostas"));
  }

  const hasAny =
    !!defaults.status ||
    !!defaults.q ||
    !!defaults.valorMin ||
    !!defaults.valorMax ||
    !!defaults.dataInicio ||
    !!defaults.dataFim;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 halo-glass rounded-halo p-3"
    >
      <Input
        key={`q-${defaults.q ?? ""}-${clearTick}`}
        name="q"
        placeholder="Buscar cliente…"
        defaultValue={defaults.q ?? ""}
        className="sm:col-span-2 lg:col-span-2"
      />

      <Select
        value={defaults.status ?? ANY}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos status</SelectItem>
          {PROPOSTA_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {PROPOSTA_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        key={`min-${defaults.valorMin ?? ""}-${clearTick}`}
        name="valor_min"
        inputMode="decimal"
        placeholder="Valor mín"
        defaultValue={defaults.valorMin ?? ""}
      />
      <Input
        key={`max-${defaults.valorMax ?? ""}-${clearTick}`}
        name="valor_max"
        inputMode="decimal"
        placeholder="Valor máx"
        defaultValue={defaults.valorMax ?? ""}
      />

      <div className="hidden lg:block" />

      <Input
        key={`di-${defaults.dataInicio ?? ""}-${clearTick}`}
        name="data_inicio"
        type="date"
        defaultValue={defaults.dataInicio ?? ""}
      />
      <Input
        key={`df-${defaults.dataFim ?? ""}-${clearTick}`}
        name="data_fim"
        type="date"
        defaultValue={defaults.dataFim ?? ""}
      />

      <div className="flex items-center gap-2 col-span-2 sm:col-span-3 lg:col-span-4 lg:justify-end">
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
    </form>
  );
}
