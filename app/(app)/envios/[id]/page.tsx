import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEnvioById } from "@/lib/envios/queries";
import { listEmbalagens } from "@/lib/embalagens/queries";
import { listInfluencersForSelect } from "@/lib/influencers/queries";
import { getPropostaById } from "@/lib/propostas/queries";
import { EnvioStatusBadge } from "@/components/envios/envio-status-badge";
import { EnvioFormDialog } from "@/components/envios/envio-form-dialog";
import { EtiquetaUpload } from "@/components/envios/etiqueta-upload";
import { GerarEtiqueta } from "@/components/envios/gerar-etiqueta";
import { getMelhorEnvioConexaoStatus } from "@/lib/melhor-envio/queries";
import {
  getMelhorEnvioRemetente,
  isRemetenteCompleto,
} from "@/lib/melhor-envio/remetente";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Params {
  id: string;
}

export default async function EnvioDetailPage({ params }: { params: Params }) {
  const [envio, embalagens, influencers, meStatus, remetente] =
    await Promise.all([
      getEnvioById(params.id),
      listEmbalagens(),
      listInfluencersForSelect(),
      getMelhorEnvioConexaoStatus(),
      getMelhorEnvioRemetente(),
    ]);
  if (!envio) notFound();

  const proposta = envio.proposta_id
    ? await getPropostaById(envio.proposta_id)
    : null;

  const embalagemNome = envio.embalagem_id
    ? embalagens.find((e) => e.id === envio.embalagem_id)?.nome ?? null
    : null;

  const meConectado = meStatus !== null;
  const remetenteCompleto = isRemetenteCompleto(remetente);
  const destinoOk =
    (envio.endereco_destino?.cep ?? "").replace(/\D/g, "").length === 8 &&
    Boolean((envio.endereco_destino?.numero ?? "").trim());
  const pesoDimsOk =
    Number(envio.peso_g) > 0 &&
    Number(envio.dimensoes_cm?.altura) > 0 &&
    Number(envio.dimensoes_cm?.largura) > 0 &&
    Number(envio.dimensoes_cm?.comprimento) > 0;
  const etiquetaDisabledReason = !meConectado
    ? "Conecte o Melhor Envio em /envios."
    : !remetenteCompleto
      ? "Preencha os dados do remetente em /envios."
      : !envio.servico
        ? "Cote o frete e escolha um serviço primeiro."
        : !destinoOk
          ? "Endereço de destino incompleto (CEP e número)."
          : !pesoDimsOk
            ? "Preencha peso e dimensões do envio."
            : null;

  const end = envio.endereco_destino;
  const linhaEndereco = end
    ? [
        [end.rua, end.numero].filter(Boolean).join(", "),
        end.complemento,
        end.bairro,
        [end.cidade, end.uf].filter(Boolean).join("/"),
        end.cep,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/envios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Envios
        </Link>
        <div className="flex items-center gap-2">
          <EnvioStatusBadge status={envio.status} />
          <EnvioFormDialog
            mode="edit"
            envio={envio}
            embalagens={embalagens}
            influencers={influencers}
            trigger={
              <Button size="sm" variant="outline">
                Editar
              </Button>
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="halo-eyebrow">Envio</p>
        <h1 className="title-display text-2xl sm:text-3xl">
          {envio.destinatario_nome}
        </h1>
        {linhaEndereco ? (
          <p className="text-sm text-muted-foreground">{linhaEndereco}</p>
        ) : null}
        {proposta ? (
          <Link
            href={`/propostas?q=${encodeURIComponent(proposta.cliente)}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
          >
            <FileText className="h-3 w-3" />
            Proposta: {proposta.titulo}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pacote */}
        <div className="halo-glass rounded-halo p-4 space-y-3">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Pacote
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Embalagem</dt>
            <dd>{embalagemNome ?? "—"}</dd>
            <dt className="text-muted-foreground">Peso</dt>
            <dd>{envio.peso_g != null ? `${envio.peso_g} g` : "—"}</dd>
            <dt className="text-muted-foreground">Dimensões</dt>
            <dd>
              {envio.dimensoes_cm &&
              (envio.dimensoes_cm.altura ||
                envio.dimensoes_cm.largura ||
                envio.dimensoes_cm.comprimento)
                ? `${envio.dimensoes_cm.altura ?? "?"} × ${envio.dimensoes_cm.largura ?? "?"} × ${envio.dimensoes_cm.comprimento ?? "?"} cm`
                : "—"}
            </dd>
          </dl>
        </div>

        {/* Transporte */}
        <div className="halo-glass rounded-halo p-4 space-y-3">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Transporte
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Transportadora</dt>
            <dd>{envio.transportadora ?? "—"}</dd>
            <dt className="text-muted-foreground">Serviço</dt>
            <dd>{envio.servico ?? "—"}</dd>
            <dt className="text-muted-foreground">Frete</dt>
            <dd className="font-mono">
              {envio.valor_frete != null ? formatBRL(envio.valor_frete) : "—"}
            </dd>
            <dt className="text-muted-foreground">Rastreio</dt>
            <dd className="font-mono text-xs break-all">
              {envio.tracking_url && envio.codigo_rastreio ? (
                <a
                  href={envio.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {envio.codigo_rastreio}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                envio.codigo_rastreio ?? "—"
              )}
            </dd>
          </dl>
        </div>

        {/* Datas */}
        <div className="halo-glass rounded-halo p-4 space-y-3">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Datas
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Postagem</dt>
            <dd>{formatDateBR(envio.data_postagem)}</dd>
            <dt className="text-muted-foreground">Entrega prevista</dt>
            <dd>{formatDateBR(envio.data_entrega_prevista)}</dd>
            <dt className="text-muted-foreground">Entrega efetiva</dt>
            <dd>{formatDateBR(envio.data_entrega_efetiva)}</dd>
          </dl>
        </div>

        {/* Etiqueta */}
        <div className="space-y-3">
          <EtiquetaUpload
            envioId={envio.id}
            etiquetaPath={envio.etiqueta_url}
          />
          <div className="halo-glass rounded-halo p-4 space-y-2">
            <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
              Gerar pelo Melhor Envio
            </p>
            <GerarEtiqueta
              envioId={envio.id}
              disabledReason={etiquetaDisabledReason}
              jaGerada={Boolean(envio.melhor_envio_order_id)}
              valorSugerido={envio.valor_frete}
            />
            {etiquetaDisabledReason ? (
              <p className="text-[11px] text-muted-foreground">
                {etiquetaDisabledReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {envio.observacoes ? (
        <div className="halo-glass rounded-halo p-4 space-y-2">
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Observações
          </p>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">
            {envio.observacoes}
          </p>
        </div>
      ) : null}
    </div>
  );
}
