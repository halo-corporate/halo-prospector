"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ENVIO_STATUSES,
  ENVIO_STATUS_LABELS,
  type Embalagem,
  type Envio,
  type EnvioStatus,
  type Influencer,
} from "@/lib/database.types";
import { createEnvioAction, updateEnvioAction } from "@/lib/envios/actions";
import { EmbalagemSelect } from "@/components/embalagens/embalagem-select";
import { CotacaoFrete } from "@/components/envios/cotacao-frete";

const INFLUENCER_NONE = "_none_";

interface Props {
  mode: "create" | "edit";
  envio?: Envio;
  embalagens: Pick<Embalagem, "id" | "nome">[];
  influencers?: Pick<Influencer, "id" | "nome">[];
  /** Pré-preenchimento ao criar envio a partir de outro contexto (ex: proposta). */
  prefill?: {
    destinatarioNome?: string;
    propostaId?: string;
  };
  /** Habilita a cotação automática de frete (Melhor Envio conectado). */
  melhorEnvioConectado?: boolean;
  /** CEP de origem padrão (env), pré-preenchido na cotação. */
  fromCepDefault?: string;
  trigger?: React.ReactNode;
}

export function EnvioFormDialog({
  mode,
  envio,
  embalagens,
  influencers = [],
  prefill,
  melhorEnvioConectado = false,
  fromCepDefault = "",
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [destinatarioNome, setDestinatarioNome] = useState(
    envio?.destinatario_nome ?? prefill?.destinatarioNome ?? "",
  );
  const [status, setStatus] = useState<EnvioStatus>(
    envio?.status ?? "a_despachar",
  );
  const [embalagemId, setEmbalagemId] = useState<string | null>(
    envio?.embalagem_id ?? null,
  );
  const [influencerId, setInfluencerId] = useState<string | null>(
    envio?.influencer_id ?? null,
  );

  // Endereço
  const [cep, setCep] = useState(envio?.endereco_destino?.cep ?? "");
  const [rua, setRua] = useState(envio?.endereco_destino?.rua ?? "");
  const [numero, setNumero] = useState(envio?.endereco_destino?.numero ?? "");
  const [complemento, setComplemento] = useState(
    envio?.endereco_destino?.complemento ?? "",
  );
  const [bairro, setBairro] = useState(envio?.endereco_destino?.bairro ?? "");
  const [cidade, setCidade] = useState(envio?.endereco_destino?.cidade ?? "");
  const [uf, setUf] = useState(envio?.endereco_destino?.uf ?? "");

  // Pacote
  const [pesoG, setPesoG] = useState(
    envio?.peso_g != null ? String(envio.peso_g) : "",
  );
  const [dimAltura, setDimAltura] = useState(
    envio?.dimensoes_cm?.altura != null ? String(envio.dimensoes_cm.altura) : "",
  );
  const [dimLargura, setDimLargura] = useState(
    envio?.dimensoes_cm?.largura != null
      ? String(envio.dimensoes_cm.largura)
      : "",
  );
  const [dimComprimento, setDimComprimento] = useState(
    envio?.dimensoes_cm?.comprimento != null
      ? String(envio.dimensoes_cm.comprimento)
      : "",
  );

  // Transporte
  const [transportadora, setTransportadora] = useState(
    envio?.transportadora ?? "",
  );
  const [servico, setServico] = useState(envio?.servico ?? "");
  const [codigoRastreio, setCodigoRastreio] = useState(
    envio?.codigo_rastreio ?? "",
  );
  const [trackingUrl, setTrackingUrl] = useState(envio?.tracking_url ?? "");
  const [valorFrete, setValorFrete] = useState(
    envio?.valor_frete != null
      ? String(envio.valor_frete).replace(".", ",")
      : "",
  );

  // Datas
  const [dataPostagem, setDataPostagem] = useState(envio?.data_postagem ?? "");
  const [dataEntregaPrevista, setDataEntregaPrevista] = useState(
    envio?.data_entrega_prevista ?? "",
  );
  const [dataEntregaEfetiva, setDataEntregaEfetiva] = useState(
    envio?.data_entrega_efetiva ?? "",
  );

  const [observacoes, setObservacoes] = useState(envio?.observacoes ?? "");

  // reset ao abrir
  useEffect(() => {
    if (!open) return;
    setDestinatarioNome(
      envio?.destinatario_nome ?? prefill?.destinatarioNome ?? "",
    );
    setStatus(envio?.status ?? "a_despachar");
    setEmbalagemId(envio?.embalagem_id ?? null);
    setInfluencerId(envio?.influencer_id ?? null);
    setCep(envio?.endereco_destino?.cep ?? "");
    setRua(envio?.endereco_destino?.rua ?? "");
    setNumero(envio?.endereco_destino?.numero ?? "");
    setComplemento(envio?.endereco_destino?.complemento ?? "");
    setBairro(envio?.endereco_destino?.bairro ?? "");
    setCidade(envio?.endereco_destino?.cidade ?? "");
    setUf(envio?.endereco_destino?.uf ?? "");
    setPesoG(envio?.peso_g != null ? String(envio.peso_g) : "");
    setDimAltura(
      envio?.dimensoes_cm?.altura != null
        ? String(envio.dimensoes_cm.altura)
        : "",
    );
    setDimLargura(
      envio?.dimensoes_cm?.largura != null
        ? String(envio.dimensoes_cm.largura)
        : "",
    );
    setDimComprimento(
      envio?.dimensoes_cm?.comprimento != null
        ? String(envio.dimensoes_cm.comprimento)
        : "",
    );
    setTransportadora(envio?.transportadora ?? "");
    setServico(envio?.servico ?? "");
    setCodigoRastreio(envio?.codigo_rastreio ?? "");
    setTrackingUrl(envio?.tracking_url ?? "");
    setValorFrete(
      envio?.valor_frete != null
        ? String(envio.valor_frete).replace(".", ",")
        : "",
    );
    setDataPostagem(envio?.data_postagem ?? "");
    setDataEntregaPrevista(envio?.data_entrega_prevista ?? "");
    setDataEntregaEfetiva(envio?.data_entrega_efetiva ?? "");
    setObservacoes(envio?.observacoes ?? "");
  }, [open, envio]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("destinatario_nome", destinatarioNome);
    fd.set("status", status);
    if (embalagemId) fd.set("embalagem_id", embalagemId);
    if (influencerId) fd.set("influencer_id", influencerId);
    if (mode === "create" && prefill?.propostaId) {
      fd.set("proposta_id", prefill.propostaId);
    }
    if (mode === "edit" && envio?.proposta_id) {
      fd.set("proposta_id", envio.proposta_id);
    }
    fd.set("endereco_cep", cep);
    fd.set("endereco_rua", rua);
    fd.set("endereco_numero", numero);
    fd.set("endereco_complemento", complemento);
    fd.set("endereco_bairro", bairro);
    fd.set("endereco_cidade", cidade);
    fd.set("endereco_uf", uf);
    fd.set("peso_g", pesoG);
    fd.set("dim_altura", dimAltura);
    fd.set("dim_largura", dimLargura);
    fd.set("dim_comprimento", dimComprimento);
    fd.set("transportadora", transportadora);
    fd.set("servico", servico);
    fd.set("codigo_rastreio", codigoRastreio);
    fd.set("tracking_url", trackingUrl);
    fd.set("valor_frete", valorFrete);
    fd.set("data_postagem", dataPostagem);
    fd.set("data_entrega_prevista", dataEntregaPrevista);
    fd.set("data_entrega_efetiva", dataEntregaEfetiva);
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createEnvioAction(fd)
          : await updateEnvioAction(envio!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(mode === "create" ? "Envio criado" : "Envio atualizado");
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Novo envio
      </Button>
    ) : (
      <Button size="icon" variant="ghost" className="h-6 w-6">
        <Pencil className="h-3 w-3" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo envio" : "Editar envio"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Cadastre um envio de produto (kit influencer, amostra, venda, etc)."
              : "Atualize os dados do envio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Destinatário + status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="env-dest">Destinatário *</Label>
              <Input
                id="env-dest"
                value={destinatarioNome}
                onChange={(e) => setDestinatarioNome(e.target.value)}
                placeholder="Nome completo de quem recebe"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-status">Status *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as EnvioStatus)}
              >
                <SelectTrigger id="env-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ENVIO_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Endereço */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Endereço de entrega
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="env-cep">CEP</Label>
                <Input
                  id="env-cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="env-rua">Rua</Label>
                <Input
                  id="env-rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-num">Nº</Label>
                <Input
                  id="env-num"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="env-compl">Complemento</Label>
                <Input
                  id="env-compl"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="env-bairro">Bairro</Label>
                <Input
                  id="env-bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-cid">Cidade</Label>
                <Input
                  id="env-cid"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-uf">UF</Label>
                <Input
                  id="env-uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          {/* Embalagem + pacote */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Embalagem & pacote
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Embalagem</Label>
                <EmbalagemSelect
                  embalagens={embalagens}
                  value={embalagemId}
                  onChange={setEmbalagemId}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-infl">Influencer (kit)</Label>
                <Select
                  value={influencerId ?? INFLUENCER_NONE}
                  onValueChange={(v) =>
                    setInfluencerId(v === INFLUENCER_NONE ? null : v)
                  }
                >
                  <SelectTrigger id="env-infl">
                    <SelectValue placeholder="Vincular a um influencer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INFLUENCER_NONE}>
                      Não vincular
                    </SelectItem>
                    {influencers.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="env-peso">Peso (g)</Label>
                <Input
                  id="env-peso"
                  type="number"
                  min={1}
                  step={1}
                  value={pesoG}
                  onChange={(e) => setPesoG(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-alt">Altura (cm)</Label>
                <Input
                  id="env-alt"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dimAltura}
                  onChange={(e) => setDimAltura(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-larg">Largura (cm)</Label>
                <Input
                  id="env-larg"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dimLargura}
                  onChange={(e) => setDimLargura(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-comp">Compr. (cm)</Label>
                <Input
                  id="env-comp"
                  type="number"
                  min={0}
                  step="0.1"
                  value={dimComprimento}
                  onChange={(e) => setDimComprimento(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Transporte */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Transporte
            </p>
            <CotacaoFrete
              conectado={melhorEnvioConectado}
              fromCepDefault={fromCepDefault}
              destinoCep={cep}
              pesoG={pesoG}
              altura={dimAltura}
              largura={dimLargura}
              comprimento={dimComprimento}
              onSelect={({ transportadora, servico, valor }) => {
                setTransportadora(transportadora);
                setServico(servico);
                setValorFrete(valor.toFixed(2).replace(".", ","));
              }}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="env-transp">Transportadora</Label>
                <Input
                  id="env-transp"
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  placeholder="Correios, Jadlog…"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-serv">Serviço</Label>
                <Input
                  id="env-serv"
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  placeholder="PAC, SEDEX, Expresso…"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-frete">Valor frete (R$)</Label>
                <Input
                  id="env-frete"
                  inputMode="decimal"
                  value={valorFrete}
                  onChange={(e) => setValorFrete(e.target.value)}
                  placeholder="29,90"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="env-rastreio">Código de rastreio</Label>
                <Input
                  id="env-rastreio"
                  value={codigoRastreio}
                  onChange={(e) => setCodigoRastreio(e.target.value)}
                  maxLength={80}
                  placeholder="BR123456789BR"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env-tracking">URL de rastreio</Label>
                <Input
                  id="env-tracking"
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  maxLength={1000}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="env-dp">Data de postagem</Label>
              <Input
                id="env-dp"
                type="date"
                value={dataPostagem}
                onChange={(e) => setDataPostagem(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-dep">Entrega prevista</Label>
              <Input
                id="env-dep"
                type="date"
                value={dataEntregaPrevista}
                onChange={(e) => setDataEntregaPrevista(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env-dee">Entrega efetiva</Label>
              <Input
                id="env-dee"
                type="date"
                value={dataEntregaEfetiva}
                onChange={(e) => setDataEntregaEfetiva(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="env-obs">Observações</Label>
            <Textarea
              id="env-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Anotações internas, instruções de entrega…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !destinatarioNome.trim()}
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar envio"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
