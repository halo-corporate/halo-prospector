"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Instagram, MapPin, Trash2, Youtube } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  INFLUENCER_CONTRATO_TIPO_LABELS,
  type Influencer,
} from "@/lib/database.types";
import { deleteInfluencerAction } from "@/lib/influencers/actions";
import { formatBRL } from "@/lib/format";
import { InfluencerStatusBadge } from "./influencer-status-badge";
import { InfluencerFormDialog } from "./influencer-form-dialog";

function formatSeg(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

interface Props {
  influencer: Influencer;
}

export function InfluencerCard({ influencer }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteInfluencerAction(influencer.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  return (
    <div
      className={cn(
        "group halo-glass rounded-halo p-4 flex flex-col gap-3",
        pending && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <InfluencerStatusBadge status={influencer.status} />
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <InfluencerFormDialog mode="edit" influencer={influencer} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive"
                disabled={pending}
                aria-label="Excluir influencer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir influencer?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong className="text-foreground">{influencer.nome}</strong>{" "}
                  e todos os pagamentos vinculados vão ser removidos
                  permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-0.5 min-w-0">
        <Link
          href={`/influencers/${influencer.id}`}
          className="block hover:text-primary transition-colors"
        >
          <h3 className="font-display font-bold uppercase tracking-[0.04em] text-sm leading-tight truncate">
            {influencer.nome}
          </h3>
        </Link>
        {influencer.nicho || influencer.cidade ? (
          <p className="text-xs text-muted-foreground truncate">
            {[influencer.nicho, influencer.cidade && influencer.uf
              ? `${influencer.cidade}/${influencer.uf}`
              : influencer.cidade]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Handles compactos */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        {influencer.handle_instagram ? (
          <span className="inline-flex items-center gap-1">
            <Instagram className="h-3 w-3" />
            <span className="font-mono">@{influencer.handle_instagram}</span>
            {influencer.seguidores_instagram != null ? (
              <span className="text-muted-foreground/70">
                · {formatSeg(influencer.seguidores_instagram)}
              </span>
            ) : null}
          </span>
        ) : null}
        {influencer.handle_tiktok ? (
          <span className="inline-flex items-center gap-1">
            <span className="font-display font-bold text-[10px]">TT</span>
            <span className="font-mono">@{influencer.handle_tiktok}</span>
            {influencer.seguidores_tiktok != null ? (
              <span className="text-muted-foreground/70">
                · {formatSeg(influencer.seguidores_tiktok)}
              </span>
            ) : null}
          </span>
        ) : null}
        {influencer.handle_youtube ? (
          <span className="inline-flex items-center gap-1">
            <Youtube className="h-3 w-3" />
            <span className="font-mono">@{influencer.handle_youtube}</span>
            {influencer.seguidores_youtube != null ? (
              <span className="text-muted-foreground/70">
                · {formatSeg(influencer.seguidores_youtube)}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* Métricas + contrato */}
      <div className="flex items-baseline gap-2 flex-wrap mt-auto pt-2 border-t border-white/5">
        {influencer.engajamento_pct != null ? (
          <p className="font-mono font-semibold text-lg text-primary">
            {String(influencer.engajamento_pct).replace(".", ",")}%
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Sem engajamento</p>
        )}
        {influencer.contrato_tipo ? (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {INFLUENCER_CONTRATO_TIPO_LABELS[influencer.contrato_tipo]}
            {influencer.valor_cache != null
              ? ` · ${formatBRL(influencer.valor_cache)}`
              : ""}
          </p>
        ) : null}
      </div>

      {influencer.posts_url.length > 0 ? (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {influencer.posts_url.length}{" "}
          {influencer.posts_url.length === 1 ? "post" : "posts"} publicado
          {influencer.posts_url.length === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}
