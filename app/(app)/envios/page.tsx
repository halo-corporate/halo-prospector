import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listEnvios } from "@/lib/envios/queries";
import { listEmbalagens } from "@/lib/embalagens/queries";
import { listInfluencersForSelect } from "@/lib/influencers/queries";
import {
  ENVIO_STATUSES,
  ENVIO_STATUS_LABELS,
  type EnvioStatus,
} from "@/lib/database.types";
import { EnviosFilters } from "@/components/envios/envios-filters";
import { EnviosTable } from "@/components/envios/envios-table";
import { EnvioFormDialog } from "@/components/envios/envio-form-dialog";
import { MelhorEnvioCard } from "@/components/envios/melhor-envio-card";
import {
  isMelhorEnvioConfigured,
  getMelhorEnvioFromCep,
} from "@/lib/melhor-envio/config";
import { getMelhorEnvioConexaoStatus } from "@/lib/melhor-envio/queries";

export const metadata = { title: "Envios — HALO Prospector" };
export const dynamic = "force-dynamic";

type Origem = "proposta" | "influencer" | "lead" | "avulso";

interface SearchParams {
  status?: string;
  q?: string;
  origem?: string;
  data_inicio?: string;
  data_fim?: string;
  me?: string;
}

function isOneOf<T extends string>(
  v: string | undefined,
  list: T[],
): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

export default async function EnviosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    status: isOneOf<EnvioStatus>(searchParams.status, [...ENVIO_STATUSES]),
    q: searchParams.q || undefined,
    origem: isOneOf<Origem>(searchParams.origem, [
      "proposta",
      "influencer",
      "lead",
      "avulso",
    ]),
    dataInicio: searchParams.data_inicio || undefined,
    dataFim: searchParams.data_fim || undefined,
  };

  const [envios, embalagens, influencers, meStatus] = await Promise.all([
    listEnvios(filters),
    listEmbalagens(),
    listInfluencersForSelect(),
    getMelhorEnvioConexaoStatus(),
  ]);
  const meConfigured = isMelhorEnvioConfigured();
  const meConectado = meStatus !== null;
  const fromCepDefault = getMelhorEnvioFromCep() ?? "";

  const hasFiltersActive = Boolean(
    filters.status ||
      filters.q ||
      filters.origem ||
      filters.dataInicio ||
      filters.dataFim,
  );

  const byStatus = new Map<EnvioStatus, number>();
  for (const e of envios) {
    byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
  }

  return (
    <div className="container py-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="halo-eyebrow">Envios</p>
          <h1 className="title-display text-3xl sm:text-4xl">Envios</h1>
          <p className="text-sm text-muted-foreground">
            {envios.length === 0 && !hasFiltersActive
              ? "Pipeline de envios: do despacho até a entrega, num só lugar."
              : `${envios.length} ${envios.length === 1 ? "envio" : "envios"} encontrados`}
          </p>
        </div>
        <EnvioFormDialog
          mode="create"
          embalagens={embalagens}
          influencers={influencers}
          melhorEnvioConectado={meConectado}
          fromCepDefault={fromCepDefault}
        />
      </div>

      <MelhorEnvioCard
        configured={meConfigured}
        connected={meStatus !== null}
        ambiente={meStatus?.ambiente}
        expiresAt={meStatus?.expiresAt}
        expired={meStatus?.expired}
        notice={searchParams.me}
      />

      <EnviosFilters
        defaults={{
          status: filters.status,
          q: filters.q,
          origem: filters.origem,
          dataInicio: filters.dataInicio,
          dataFim: filters.dataFim,
        }}
      />

      {envios.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {ENVIO_STATUSES.map((s) => (
            <div
              key={s}
              className="halo-glass rounded-halo p-3 flex flex-col gap-1"
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {ENVIO_STATUS_LABELS[s]}
              </p>
              <p className="font-display font-bold text-2xl tracking-[0.02em]">
                {byStatus.get(s) ?? 0}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {envios.length === 0 ? (
        hasFiltersActive ? (
          <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
            Nenhum envio encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
                Nenhum envio registrado
              </h2>
              <p className="text-sm text-muted-foreground">
                Registre cada envio aqui: kit influencer, amostra para
                decisor, venda fechada. Anexe a etiqueta PDF e acompanhe o
                rastreio.
              </p>
            </div>
            <EnvioFormDialog
              mode="create"
              embalagens={embalagens}
              influencers={influencers}
              melhorEnvioConectado={meConectado}
              fromCepDefault={fromCepDefault}
              trigger={
                <Button size="sm">
                  <Truck className="h-3.5 w-3.5" />
                  Criar primeiro envio
                </Button>
              }
            />
          </div>
        )
      ) : (
        <EnviosTable
          envios={envios}
          embalagens={embalagens}
          influencers={influencers}
          melhorEnvioConectado={meConectado}
          fromCepDefault={fromCepDefault}
        />
      )}
    </div>
  );
}
