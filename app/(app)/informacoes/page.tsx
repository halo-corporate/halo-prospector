import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listInformacaoCategorias,
  listInformacoes,
} from "@/lib/informacoes/queries";
import { informacaoCategoriaLabel } from "@/lib/database.types";
import { InfoCard } from "@/components/informacoes/info-card";
import { InfoFormDialog } from "@/components/informacoes/info-form-dialog";
import { InfoFilters } from "@/components/informacoes/info-filters";

export const metadata = { title: "Informações Internas — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  categoria?: string;
  q?: string;
}

export default async function InformacoesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    categoria: searchParams.categoria || undefined,
    q: searchParams.q || undefined,
  };

  const [items, categoriasExistentes] = await Promise.all([
    listInformacoes(filters),
    listInformacaoCategorias(),
  ]);

  // Agrupa por categoria preservando a ordem da query (já vem ordenado por
  // categoria asc, então só consolida).
  const grouped = new Map<string, typeof items>();
  for (const it of items) {
    const arr = grouped.get(it.categoria) ?? [];
    arr.push(it);
    grouped.set(it.categoria, arr);
  }

  const noFiltersActive = !filters.categoria && !filters.q;

  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Internas</p>
          <h1 className="title-display text-2xl">Informações Internas</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0 && noFiltersActive
              ? "CNPJ, dados bancários, contatos e credenciais da HALO num só lugar."
              : `${items.length} ${items.length === 1 ? "registro" : "registros"} encontrados`}
          </p>
        </div>
        <InfoFormDialog
          mode="create"
          categoriasExistentes={categoriasExistentes}
        />
      </div>

      <InfoFilters
        defaults={filters}
        categoriasExistentes={categoriasExistentes}
      />

      {items.length === 0 ? (
        noFiltersActive ? (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhuma informação salva
              </h2>
              <p className="text-sm text-muted-foreground">
                Centralize aqui o CNPJ, dados bancários, telefones e logins
                que você precisa olhar de vez em quando. Credenciais ficam
                mascaradas por default.
              </p>
            </div>
            <InfoFormDialog
              mode="create"
              categoriasExistentes={categoriasExistentes}
              trigger={
                <Button size="sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Adicionar primeira informação
                </Button>
              }
            />
          </div>
        ) : (
          <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
            Nada encontrado com esses filtros.
          </div>
        )
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cat, list]) => (
            <section key={cat} className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {informacaoCategoriaLabel(cat)}{" "}
                <span className="text-muted-foreground/60">({list.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {list.map((info) => (
                  <InfoCard key={info.id} info={info} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
