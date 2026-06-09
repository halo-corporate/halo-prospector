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
  INFLUENCER_CONTRATO_TIPOS,
  INFLUENCER_CONTRATO_TIPO_LABELS,
  INFLUENCER_STATUSES,
  INFLUENCER_STATUS_LABELS,
  type Influencer,
  type InfluencerContratoTipo,
  type InfluencerStatus,
} from "@/lib/database.types";
import {
  createInfluencerAction,
  updateInfluencerAction,
} from "@/lib/influencers/actions";

const CONTRATO_NONE = "_none_";

interface Props {
  mode: "create" | "edit";
  influencer?: Influencer;
  trigger?: React.ReactNode;
}

export function InfluencerFormDialog({ mode, influencer, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nome, setNome] = useState(influencer?.nome ?? "");
  const [status, setStatus] = useState<InfluencerStatus>(
    influencer?.status ?? "prospeccao",
  );
  const [contratoTipo, setContratoTipo] = useState<
    InfluencerContratoTipo | typeof CONTRATO_NONE
  >(influencer?.contrato_tipo ?? CONTRATO_NONE);
  const [valorCache, setValorCache] = useState(
    influencer?.valor_cache != null
      ? String(influencer.valor_cache).replace(".", ",")
      : "",
  );

  const [handleIg, setHandleIg] = useState(influencer?.handle_instagram ?? "");
  const [handleTt, setHandleTt] = useState(influencer?.handle_tiktok ?? "");
  const [handleYt, setHandleYt] = useState(influencer?.handle_youtube ?? "");
  const [segIg, setSegIg] = useState(
    influencer?.seguidores_instagram != null
      ? String(influencer.seguidores_instagram)
      : "",
  );
  const [segTt, setSegTt] = useState(
    influencer?.seguidores_tiktok != null
      ? String(influencer.seguidores_tiktok)
      : "",
  );
  const [segYt, setSegYt] = useState(
    influencer?.seguidores_youtube != null
      ? String(influencer.seguidores_youtube)
      : "",
  );
  const [engajamentoPct, setEngajamentoPct] = useState(
    influencer?.engajamento_pct != null
      ? String(influencer.engajamento_pct).replace(".", ",")
      : "",
  );

  const [nicho, setNicho] = useState(influencer?.nicho ?? "");
  const [cidade, setCidade] = useState(influencer?.cidade ?? "");
  const [uf, setUf] = useState(influencer?.uf ?? "");

  const [alcanceTotal, setAlcanceTotal] = useState(
    influencer?.alcance_total != null ? String(influencer.alcance_total) : "",
  );
  const [engajamentoTotal, setEngajamentoTotal] = useState(
    influencer?.engajamento_total != null
      ? String(influencer.engajamento_total)
      : "",
  );

  const [observacoes, setObservacoes] = useState(influencer?.observacoes ?? "");

  useEffect(() => {
    if (!open) return;
    setNome(influencer?.nome ?? "");
    setStatus(influencer?.status ?? "prospeccao");
    setContratoTipo(influencer?.contrato_tipo ?? CONTRATO_NONE);
    setValorCache(
      influencer?.valor_cache != null
        ? String(influencer.valor_cache).replace(".", ",")
        : "",
    );
    setHandleIg(influencer?.handle_instagram ?? "");
    setHandleTt(influencer?.handle_tiktok ?? "");
    setHandleYt(influencer?.handle_youtube ?? "");
    setSegIg(
      influencer?.seguidores_instagram != null
        ? String(influencer.seguidores_instagram)
        : "",
    );
    setSegTt(
      influencer?.seguidores_tiktok != null
        ? String(influencer.seguidores_tiktok)
        : "",
    );
    setSegYt(
      influencer?.seguidores_youtube != null
        ? String(influencer.seguidores_youtube)
        : "",
    );
    setEngajamentoPct(
      influencer?.engajamento_pct != null
        ? String(influencer.engajamento_pct).replace(".", ",")
        : "",
    );
    setNicho(influencer?.nicho ?? "");
    setCidade(influencer?.cidade ?? "");
    setUf(influencer?.uf ?? "");
    setAlcanceTotal(
      influencer?.alcance_total != null
        ? String(influencer.alcance_total)
        : "",
    );
    setEngajamentoTotal(
      influencer?.engajamento_total != null
        ? String(influencer.engajamento_total)
        : "",
    );
    setObservacoes(influencer?.observacoes ?? "");
  }, [open, influencer]);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("nome", nome);
    fd.set("status", status);
    if (contratoTipo !== CONTRATO_NONE) fd.set("contrato_tipo", contratoTipo);
    fd.set("valor_cache", valorCache);
    fd.set("handle_instagram", handleIg);
    fd.set("handle_tiktok", handleTt);
    fd.set("handle_youtube", handleYt);
    fd.set("seguidores_instagram", segIg);
    fd.set("seguidores_tiktok", segTt);
    fd.set("seguidores_youtube", segYt);
    fd.set("engajamento_pct", engajamentoPct);
    fd.set("nicho", nicho);
    fd.set("cidade", cidade);
    fd.set("uf", uf);
    fd.set("alcance_total", alcanceTotal);
    fd.set("engajamento_total", engajamentoTotal);
    fd.set("observacoes", observacoes);

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createInfluencerAction(fd)
          : await updateInfluencerAction(influencer!.id, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        mode === "create" ? "Influencer criado" : "Influencer atualizado",
      );
      setOpen(false);
    });
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button size="sm">
        <Plus className="h-3.5 w-3.5" />
        Novo influencer
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
            {mode === "create" ? "Novo influencer" : "Editar influencer"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Cadastre um influenciador parceiro com handles e métricas."
              : "Atualize dados, métricas e status do influencer."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome + status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inf-nome">Nome *</Label>
              <Input
                id="inf-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome ou apelido público"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-status">Status *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as InfluencerStatus)}
              >
                <SelectTrigger id="inf-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INFLUENCER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {INFLUENCER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Handles + seguidores */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Redes sociais
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-ig">Instagram (@)</Label>
                <Input
                  id="inf-ig"
                  value={handleIg}
                  onChange={(e) => setHandleIg(e.target.value)}
                  placeholder="usuario"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-seg-ig">Seguidores IG</Label>
                <Input
                  id="inf-seg-ig"
                  type="number"
                  min={0}
                  value={segIg}
                  onChange={(e) => setSegIg(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-tt">TikTok (@)</Label>
                <Input
                  id="inf-tt"
                  value={handleTt}
                  onChange={(e) => setHandleTt(e.target.value)}
                  placeholder="usuario"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-seg-tt">Seguidores TikTok</Label>
                <Input
                  id="inf-seg-tt"
                  type="number"
                  min={0}
                  value={segTt}
                  onChange={(e) => setSegTt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-yt">YouTube (@)</Label>
                <Input
                  id="inf-yt"
                  value={handleYt}
                  onChange={(e) => setHandleYt(e.target.value)}
                  placeholder="canal"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inf-seg-yt">Seguidores YT</Label>
                <Input
                  id="inf-seg-yt"
                  type="number"
                  min={0}
                  value={segYt}
                  onChange={(e) => setSegYt(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inf-eng-pct">Engajamento médio (%)</Label>
                <Input
                  id="inf-eng-pct"
                  inputMode="decimal"
                  value={engajamentoPct}
                  onChange={(e) => setEngajamentoPct(e.target.value)}
                  placeholder="3,5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inf-alcance">Alcance total</Label>
                <Input
                  id="inf-alcance"
                  type="number"
                  min={0}
                  value={alcanceTotal}
                  onChange={(e) => setAlcanceTotal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inf-eng-total">Engajamento total</Label>
                <Input
                  id="inf-eng-total"
                  type="number"
                  min={0}
                  value={engajamentoTotal}
                  onChange={(e) => setEngajamentoTotal(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Perfil */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inf-nicho">Nicho</Label>
              <Input
                id="inf-nicho"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                placeholder="wellness, sono, fitness…"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-cidade">Cidade</Label>
              <Input
                id="inf-cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-uf">UF</Label>
              <Input
                id="inf-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>

          {/* Contrato */}
          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Contrato
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inf-contrato">Tipo de contrato</Label>
                <Select
                  value={contratoTipo}
                  onValueChange={(v) =>
                    setContratoTipo(v as InfluencerContratoTipo | typeof CONTRATO_NONE)
                  }
                >
                  <SelectTrigger id="inf-contrato">
                    <SelectValue placeholder="Sem contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CONTRATO_NONE}>Sem contrato</SelectItem>
                    {INFLUENCER_CONTRATO_TIPOS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {INFLUENCER_CONTRATO_TIPO_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inf-valor">Valor do cachê (R$)</Label>
                <Input
                  id="inf-valor"
                  inputMode="decimal"
                  value={valorCache}
                  onChange={(e) => setValorCache(e.target.value)}
                  placeholder="1.500,00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inf-obs">Observações</Label>
            <Textarea
              id="inf-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Histórico, fit com a marca, próximos passos…"
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
            disabled={pending || !nome.trim()}
          >
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Criar influencer"
                : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
