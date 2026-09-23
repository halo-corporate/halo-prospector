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
  INFLUENCER_CONTRATO_TIPOS,
  INFLUENCER_CONTRATO_TIPO_LABELS,
  INFLUENCER_STATUSES,
  INFLUENCER_STATUS_LABELS,
  type InfluencerContratoTipo,
  type InfluencerStatus,
} from "@/lib/database.types";

const ANY = "_any_";

interface Props {
  defaults: {
    status?: InfluencerStatus;
    contratoTipo?: InfluencerContratoTipo;
    q?: string;
    nicho?: string;
  };
}

export function InfluencersFilters({ defaults }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [clearTick, setClearTick] = useState(0);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`/influencers?${next.toString()}`));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(params.toString());

    const q = ((fd.get("q") as string | null) ?? "").trim();
    const nicho = ((fd.get("nicho") as string | null) ?? "").trim();

    if (q) next.set("q", q);
    else next.delete("q");
    if (nicho) next.set("nicho", nicho);
    else next.delete("nicho");

    startTransition(() => router.push(`/influencers?${next.toString()}`));
  }

  function clear() {
    formRef.current?.reset();
    setClearTick((t) => t + 1);
    startTransition(() => router.push("/influencers"));
  }

  const hasAny =
    !!defaults.status ||
    !!defaults.contratoTipo ||
    !!defaults.q ||
    !!defaults.nicho;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 halo-glass rounded-halo p-3"
    >
      <Input
        key={`q-${defaults.q ?? ""}-${clearTick}`}
        name="q"
        placeholder="Nome ou handle…"
        defaultValue={defaults.q ?? ""}
        className="sm:col-span-2"
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
          {INFLUENCER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {INFLUENCER_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaults.contratoTipo ?? ANY}
        onValueChange={(v) => setParam("contrato_tipo", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Contrato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todo contrato</SelectItem>
          {INFLUENCER_CONTRATO_TIPOS.map((c) => (
            <SelectItem key={c} value={c}>
              {INFLUENCER_CONTRATO_TIPO_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        key={`nicho-${defaults.nicho ?? ""}-${clearTick}`}
        name="nicho"
        placeholder="Nicho…"
        defaultValue={defaults.nicho ?? ""}
      />

      <div className="flex items-center gap-2 col-span-2 sm:col-span-3 lg:col-span-5 lg:justify-end">
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
