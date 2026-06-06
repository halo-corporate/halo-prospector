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
  INFORMACAO_CATEGORIAS_SUGERIDAS,
  informacaoCategoriaLabel,
} from "@/lib/database.types";

const ANY = "_any_";

interface Props {
  defaults: { categoria?: string; q?: string };
  categoriasExistentes: string[];
}

export function InfoFilters({ defaults, categoriasExistentes }: Props) {
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
      router.push(`/informacoes?${next.toString()}`);
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
      router.push(`/informacoes?${next.toString()}`);
    });
  }

  function clear() {
    formRef.current?.reset();
    setClearTick((t) => t + 1);
    startTransition(() => router.push("/informacoes"));
  }

  const allCategorias = Array.from(
    new Set([...INFORMACAO_CATEGORIAS_SUGERIDAS, ...categoriasExistentes]),
  );

  const hasAny = !!defaults.categoria || !!defaults.q;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 halo-glass rounded-halo p-3"
    >
      <Input
        key={`q-${defaults.q ?? ""}-${clearTick}`}
        name="q"
        placeholder="Buscar título…"
        defaultValue={defaults.q ?? ""}
        className="lg:col-span-2"
      />

      <Select
        value={defaults.categoria ?? ANY}
        onValueChange={(v) => setParam("categoria", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todas categorias</SelectItem>
          {allCategorias.map((c) => (
            <SelectItem key={c} value={c}>
              {informacaoCategoriaLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 lg:justify-end">
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
