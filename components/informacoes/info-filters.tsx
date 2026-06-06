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
  INFORMACAO_CATEGORIAS_SUGERIDAS,
  informacaoCategoriaLabel,
} from "@/lib/database.types";

interface Props {
  defaults: { categorias?: string[]; q?: string };
  categoriasExistentes: string[];
}

export function InfoFilters({ defaults, categoriasExistentes }: Props) {
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

  const CATEGORIA_OPTIONS: MultiSelectOption[] = allCategorias.map((c) => ({
    value: c,
    label: informacaoCategoriaLabel(c),
  }));

  const hasAny =
    (defaults.categorias && defaults.categorias.length > 0) || !!defaults.q;

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

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Categorias
        </Label>
        <MultiSelectChips
          options={CATEGORIA_OPTIONS}
          value={defaults.categorias ?? []}
          onChange={(v) => setMultiParam("categoria", v)}
        />
      </div>
    </form>
  );
}
