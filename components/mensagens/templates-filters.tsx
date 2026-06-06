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
  LEAD_STATUS_LABELS,
  MENSAGEM_CANAIS,
  MENSAGEM_CANAL_LABELS,
  type LeadStatus,
  type MensagemCanal,
} from "@/lib/database.types";

const ANY = "_any_";

interface Props {
  defaults: {
    canal?: MensagemCanal;
    etapa?: string;
    q?: string;
  };
  /** Etapas distintas presentes no banco — pra alimentar dropdown extra. */
  etapasExtras: string[];
}

export function TemplatesFilters({ defaults, etapasExtras }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [clearTick, setClearTick] = useState(0);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
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

  const hasAny = !!defaults.canal || !!defaults.etapa || !!defaults.q;

  // Etapas conhecidas = todas do lead_status + extras do banco que não estão no enum
  const knownEtapas = new Set(Object.keys(LEAD_STATUS_LABELS));
  const extras = etapasExtras.filter((e) => !knownEtapas.has(e));

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 halo-glass rounded-halo p-3"
    >
      <Input
        key={`q-${defaults.q ?? ""}-${clearTick}`}
        name="q"
        placeholder="Buscar título…"
        defaultValue={defaults.q ?? ""}
        className="lg:col-span-2"
      />

      <Select
        value={defaults.canal ?? ANY}
        onValueChange={(v) => setParam("canal", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos canais</SelectItem>
          {MENSAGEM_CANAIS.map((c) => (
            <SelectItem key={c} value={c}>
              {MENSAGEM_CANAL_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaults.etapa ?? ANY}
        onValueChange={(v) => setParam("etapa", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todas etapas</SelectItem>
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
          {extras.map((e) => (
            <SelectItem key={e} value={e}>
              {e.replace(/_/g, " ")}
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
