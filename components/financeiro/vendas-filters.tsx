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
  VENDA_RESPONSAVEIS,
  VENDA_RESPONSAVEL_LABELS,
  VENDA_STATUSES,
  VENDA_STATUS_LABELS,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";
import { lastMonths } from "@/lib/financeiro/format";

const ANY = "_any_";

interface Props {
  defaults: {
    responsavel?: VendaResponsavel;
    status?: VendaStatus;
    mes?: string;
    q?: string;
  };
}

export function VendasFilters({ defaults }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // Incrementa em cada "Limpar" pra forçar remount de inputs não-controlados
  // mesmo quando a URL já estava sem param (texto digitado mas não aplicado).
  const [clearTick, setClearTick] = useState(0);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/financeiro?${next.toString()}`);
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
      router.push(`/financeiro?${next.toString()}`);
    });
  }

  function clear() {
    formRef.current?.reset();
    setClearTick((t) => t + 1);
    startTransition(() => router.push("/financeiro"));
  }

  const meses = lastMonths(12);
  const hasAny =
    !!defaults.responsavel || !!defaults.status || !!defaults.mes || !!defaults.q;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-[18px] border border-white/10 p-3"
    >
      <Input
        key={`q-${defaults.q ?? ""}-${clearTick}`}
        name="q"
        placeholder="Buscar cliente…"
        defaultValue={defaults.q ?? ""}
        className="lg:col-span-2"
      />

      <Select
        value={defaults.mes ?? ANY}
        onValueChange={(v) => setParam("mes", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos meses</SelectItem>
          {meses.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaults.responsavel ?? ANY}
        onValueChange={(v) => setParam("responsavel", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos responsáveis</SelectItem>
          {VENDA_RESPONSAVEIS.map((r) => (
            <SelectItem key={r} value={r}>
              {VENDA_RESPONSAVEL_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaults.status ?? ANY}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos status</SelectItem>
          {VENDA_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {VENDA_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 lg:col-span-5 lg:justify-end">
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
