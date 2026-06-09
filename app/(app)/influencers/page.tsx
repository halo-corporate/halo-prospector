import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listInfluencers } from "@/lib/influencers/queries";
import {
  INFLUENCER_CONTRATO_TIPOS,
  INFLUENCER_STATUSES,
  INFLUENCER_STATUS_LABELS,
  type InfluencerContratoTipo,
  type InfluencerStatus,
} from "@/lib/database.types";
import { InfluencerCard } from "@/components/influencers/influencer-card";
import { InfluencerFormDialog } from "@/components/influencers/influencer-form-dialog";
import { InfluencersFilters } from "@/components/influencers/influencers-filters";

export const metadata = { title: "Influencers — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  contrato_tipo?: string;
  q?: string;
  nicho?: string;
}

function isOneOf<T extends string>(
  v: string | undefined,
  list: T[],
): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

export default async function InfluencersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    status: isOneOf<InfluencerStatus>(searchParams.status, [
      ...INFLUENCER_STATUSES,
    ]),
    contratoTipo: isOneOf<InfluencerContratoTipo>(searchParams.contrato_tipo, [
      ...INFLUENCER_CONTRATO_TIPOS,
    ]),
    q: searchParams.q || undefined,
    nicho: searchParams.nicho || undefined,
  };

  const influencers = await listInfluencers(filters);

  const hasFiltersActive = Boolean(
    filters.status || filters.contratoTipo || filters.q || filters.nicho,
  );

  const byStatus = new Map<InfluencerStatus, number>();
  for (const i of influencers) {
    byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);
  }

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Influencers</p>
          <h1 className="title-display text-3xl sm:text-4xl">Influencers</h1>
          <p className="text-sm text-muted-foreground">
            {influencers.length === 0 && !hasFiltersActive
              ? "Pipeline de criadores: do primeiro contato à parceria ativa."
              : `${influencers.length} ${influencers.length === 1 ? "influencer" : "influencers"} encontrados`}
          </p>
        </div>
        <InfluencerFormDialog mode="create" />
      </div>

      <InfluencersFilters
        defaults={{
          status: filters.status,
          contratoTipo: filters.contratoTipo,
          q: filters.q,
          nicho: filters.nicho,
        }}
      />

      {influencers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {INFLUENCER_STATUSES.map((s) => (
            <div
              key={s}
              className="halo-glass rounded-halo p-3 flex flex-col gap-1"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {INFLUENCER_STATUS_LABELS[s]}
              </p>
              <p className="font-display font-bold text-2xl tracking-[0.02em]">
                {byStatus.get(s) ?? 0}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {influencers.length === 0 ? (
        hasFiltersActive ? (
          <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
            Nenhum influencer encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhum influencer cadastrado
              </h2>
              <p className="text-sm text-muted-foreground">
                Cadastre criadores aqui: handles, nicho, engajamento, contrato
                (permuta ou R$) e os posts publicados.
              </p>
            </div>
            <InfluencerFormDialog
              mode="create"
              trigger={
                <Button size="sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cadastrar primeiro influencer
                </Button>
              }
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {influencers.map((i) => (
            <InfluencerCard key={i.id} influencer={i} />
          ))}
        </div>
      )}
    </div>
  );
}
