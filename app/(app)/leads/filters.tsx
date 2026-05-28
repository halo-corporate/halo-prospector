"use client";

import { useTransition } from "react";
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
  LEAD_TEMPERATURA_LABELS,
  LEAD_VERTICAL_LABELS,
  type LeadStatus,
  type LeadTemperatura,
  type LeadVertical,
} from "@/lib/database.types";

const ANY = "_any_"; // sentinela pra "qualquer" (Select não aceita value="")

interface Props {
  defaults: {
    vertical?: LeadVertical;
    status?: LeadStatus;
    temperatura?: LeadTemperatura;
    estado?: string;
    q?: string;
  };
}

export function LeadsFilters({ defaults }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/leads?${next.toString()}`);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(params.toString());
    const q = (fd.get("q") as string | null) ?? "";
    const estado = ((fd.get("estado") as string | null) ?? "").toUpperCase();
    if (q.trim()) next.set("q", q.trim()); else next.delete("q");
    if (estado.trim()) next.set("estado", estado.trim()); else next.delete("estado");
    startTransition(() => {
      router.push(`/leads?${next.toString()}`);
    });
  }

  function clear() {
    startTransition(() => router.push("/leads"));
  }

  const hasAny =
    !!defaults.vertical ||
    !!defaults.status ||
    !!defaults.temperatura ||
    !!defaults.estado ||
    !!defaults.q;

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 rounded-lg border border-border p-3"
    >
      <Input
        name="q"
        placeholder="Buscar empresa…"
        defaultValue={defaults.q ?? ""}
        className="lg:col-span-2"
      />

      <Select
        value={defaults.vertical ?? ANY}
        onValueChange={(v) => setParam("vertical", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Vertical" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todas verticais</SelectItem>
          {(Object.keys(LEAD_VERTICAL_LABELS) as LeadVertical[]).map((v) => (
            <SelectItem key={v} value={v}>
              {LEAD_VERTICAL_LABELS[v]}
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
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={defaults.temperatura ?? ANY}
        onValueChange={(v) => setParam("temperatura", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Temperatura" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todas</SelectItem>
          {(Object.keys(LEAD_TEMPERATURA_LABELS) as LeadTemperatura[]).map(
            (t) => (
              <SelectItem key={t} value={t}>
                {LEAD_TEMPERATURA_LABELS[t]}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Input
        name="estado"
        placeholder="UF"
        maxLength={2}
        defaultValue={defaults.estado ?? ""}
        className="uppercase"
      />

      <div className="flex items-center gap-2 lg:col-span-6 lg:justify-end">
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
