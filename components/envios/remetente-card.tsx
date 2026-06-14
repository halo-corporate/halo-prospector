"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, AlertTriangle, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveRemetenteAction } from "@/lib/melhor-envio/actions";
import type { MelhorEnvioRemetente } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface Props {
  remetente: MelhorEnvioRemetente | null;
  completo: boolean;
}

export function RemetenteCard({ remetente, completo }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Mantém o remetente mais recente sem disparar o reset do formulário: o reset
  // só deve acontecer ao ABRIR o diálogo, nunca a cada re-render (senão apaga o
  // que o usuário está digitando quando a página revalida em background).
  const remetenteRef = useRef(remetente);
  remetenteRef.current = remetente;

  useEffect(() => {
    if (!open) return;
    const r = remetenteRef.current;
    setNome(r?.nome ?? "");
    setDocumento(r?.documento ?? "");
    setTelefone(r?.telefone ?? "");
    setEmail(r?.email ?? "");
    setCep(r?.cep ?? "");
    setRua(r?.rua ?? "");
    setNumero(r?.numero ?? "");
    setComplemento(r?.complemento ?? "");
    setBairro(r?.bairro ?? "");
    setCidade(r?.cidade ?? "");
    setUf(r?.uf ?? "");
  }, [open]);

  function handleSave() {
    startTransition(async () => {
      const res = await saveRemetenteAction({
        nome,
        documento,
        telefone,
        email,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Dados do remetente salvos.");
      setOpen(false);
      router.refresh();
    });
  }

  const resumo = remetente
    ? [
        remetente.nome,
        [remetente.cidade, remetente.uf].filter(Boolean).join("/"),
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="halo-glass rounded-halo p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center border",
            completo
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/20",
          )}
        >
          {completo ? (
            <MapPin className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Remetente (etiqueta)</p>
          <p className="text-xs text-muted-foreground">
            {completo
              ? resumo
              : "Preencha os dados de quem envia pra poder gerar etiquetas."}
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant={completo ? "ghost" : "default"}>
            <Pencil className="h-3.5 w-3.5" />
            {completo ? "Editar" : "Preencher"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados do remetente</DialogTitle>
            <DialogDescription>
              Identidade de quem envia, exigida pelo Melhor Envio na hora de
              gerar a etiqueta. Preenche uma vez e reusa em todos os envios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rem-nome">Nome / Razão social *</Label>
                <Input
                  id="rem-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={200}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rem-doc">CPF ou CNPJ *</Label>
                <Input
                  id="rem-doc"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="Só números"
                  maxLength={18}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rem-tel">Telefone</Label>
                <Input
                  id="rem-tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rem-email">E-mail</Label>
                <Input
                  id="rem-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="rounded-md border border-white/10 p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Endereço de origem
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rem-cep">CEP *</Label>
                  <Input
                    id="rem-cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="rem-rua">Rua</Label>
                  <Input
                    id="rem-rua"
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem-num">Nº *</Label>
                  <Input
                    id="rem-num"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rem-compl">Complemento</Label>
                  <Input
                    id="rem-compl"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rem-bairro">Bairro</Label>
                  <Input
                    id="rem-bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem-cid">Cidade</Label>
                  <Input
                    id="rem-cid"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem-uf">UF</Label>
                  <Input
                    id="rem-uf"
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
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
            <Button type="button" onClick={handleSave} disabled={pending}>
              <Check className="h-3.5 w-3.5" />
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
