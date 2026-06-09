import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInfluencerById } from "@/lib/influencers/queries";
import { listPagamentosByInfluencer } from "@/lib/influencer-pagamentos/queries";
import { INFLUENCER_CONTRATO_TIPO_LABELS } from "@/lib/database.types";
import { InfluencerStatusBadge } from "@/components/influencers/influencer-status-badge";
import { InfluencerFormDialog } from "@/components/influencers/influencer-form-dialog";
import { PostsSection } from "@/components/influencers/posts-section";
import { PagamentosSection } from "@/components/influencer-pagamentos/pagamentos-section";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Params {
  id: string;
}

function formatSeg(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

export default async function InfluencerDetailPage({
  params,
}: {
  params: Params;
}) {
  const [influencer, pagamentos] = await Promise.all([
    getInfluencerById(params.id),
    listPagamentosByInfluencer(params.id),
  ]);
  if (!influencer) notFound();

  const localizacao =
    influencer.cidade && influencer.uf
      ? `${influencer.cidade}/${influencer.uf}`
      : influencer.cidade ?? null;

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/influencers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Influencers
        </Link>
        <div className="flex items-center gap-2">
          <InfluencerStatusBadge status={influencer.status} />
          <InfluencerFormDialog
            mode="edit"
            influencer={influencer}
            trigger={
              <Button size="sm" variant="outline">
                Editar
              </Button>
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="halo-eyebrow">Influencer</p>
        <h1 className="title-display text-2xl sm:text-3xl">
          {influencer.nome}
        </h1>
        {influencer.nicho || localizacao ? (
          <p className="text-sm text-muted-foreground">
            {[influencer.nicho, localizacao].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Redes sociais */}
        <div className="halo-glass rounded-halo p-4 space-y-3">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Redes sociais
          </p>
          <ul className="space-y-2 text-sm">
            {influencer.handle_instagram ? (
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">
                    @{influencer.handle_instagram}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatSeg(influencer.seguidores_instagram)}
                </span>
              </li>
            ) : null}
            {influencer.handle_tiktok ? (
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-display font-bold text-[11px] text-muted-foreground">
                    TT
                  </span>
                  <span className="font-mono">
                    @{influencer.handle_tiktok}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatSeg(influencer.seguidores_tiktok)}
                </span>
              </li>
            ) : null}
            {influencer.handle_youtube ? (
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Youtube className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">
                    @{influencer.handle_youtube}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatSeg(influencer.seguidores_youtube)}
                </span>
              </li>
            ) : null}
            {!influencer.handle_instagram &&
            !influencer.handle_tiktok &&
            !influencer.handle_youtube ? (
              <li className="text-muted-foreground text-sm">
                Nenhum handle registrado.
              </li>
            ) : null}
          </ul>
        </div>

        {/* Métricas + contrato */}
        <div className="halo-glass rounded-halo p-4 space-y-3">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Métricas + contrato
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Engajamento</dt>
            <dd className="font-mono">
              {influencer.engajamento_pct != null
                ? `${String(influencer.engajamento_pct).replace(".", ",")}%`
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Alcance total</dt>
            <dd className="font-mono">
              {influencer.alcance_total != null
                ? formatSeg(influencer.alcance_total)
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Engajamento total</dt>
            <dd className="font-mono">
              {influencer.engajamento_total != null
                ? formatSeg(influencer.engajamento_total)
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Contrato</dt>
            <dd>
              {influencer.contrato_tipo
                ? INFLUENCER_CONTRATO_TIPO_LABELS[influencer.contrato_tipo]
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Cachê</dt>
            <dd className="font-mono">
              {influencer.valor_cache != null
                ? formatBRL(influencer.valor_cache)
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Código promocional</dt>
            <dd>
              {influencer.codigo_promocional ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono uppercase tracking-wider text-primary text-xs">
                  {influencer.codigo_promocional}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </dl>
        </div>
      </div>

      <PostsSection
        influencerId={influencer.id}
        postsUrl={influencer.posts_url ?? []}
      />

      <PagamentosSection
        influencerId={influencer.id}
        pagamentos={pagamentos}
      />

      {influencer.observacoes ? (
        <div className="halo-glass rounded-halo p-4 space-y-2">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Observações
          </p>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {influencer.observacoes}
          </p>
        </div>
      ) : null}
    </div>
  );
}
