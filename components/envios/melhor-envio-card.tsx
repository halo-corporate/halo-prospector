"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Link2Off, PlugZap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectMelhorEnvioAction } from "@/lib/melhor-envio/actions";
import { cn } from "@/lib/utils";

interface Props {
  configured: boolean;
  connected: boolean;
  ambiente?: "sandbox" | "production";
  expiresAt?: string;
  expired?: boolean;
  /** Valor do query param ?me= pra feedback pós-redirect do OAuth. */
  notice?: string;
}

const NOTICES: Record<string, { type: "success" | "error"; msg: string }> = {
  conectado: { type: "success", msg: "Melhor Envio conectado." },
  erro: { type: "error", msg: "Falha ao conectar com o Melhor Envio." },
  state_invalido: {
    type: "error",
    msg: "Sessão de conexão expirou. Tente conectar de novo.",
  },
  nao_configurado: {
    type: "error",
    msg: "Credenciais do Melhor Envio não configuradas.",
  },
  nao_autenticado: { type: "error", msg: "Faça login de novo e tente outra vez." },
};

export function MelhorEnvioCard({
  configured,
  connected,
  ambiente,
  expiresAt,
  expired,
  notice,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const noticeShown = useRef(false);

  // Mostra o feedback do redirect OAuth uma única vez e limpa o ?me= da URL.
  useEffect(() => {
    if (!notice || noticeShown.current) return;
    noticeShown.current = true;
    const n = NOTICES[notice];
    if (n) (n.type === "success" ? toast.success : toast.error)(n.msg);
    router.replace("/envios");
  }, [notice, router]);

  function handleDisconnect() {
    startTransition(async () => {
      const res = await disconnectMelhorEnvioAction();
      if (res.ok) {
        toast.success("Melhor Envio desconectado.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  if (!configured) {
    return (
      <div className="halo-glass rounded-halo p-4 flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Melhor Envio — não configurado</p>
          <p className="text-xs text-muted-foreground">
            Defina as credenciais (Client-Id, Client-Secret e Redirect URI) nas
            variáveis de ambiente pra habilitar a conexão.
          </p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="halo-glass rounded-halo p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PlugZap className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Melhor Envio</p>
            <p className="text-xs text-muted-foreground">
              Conecte sua conta pra cotar frete, gerar etiqueta e rastrear
              direto daqui.
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <a href="/api/melhor-envio/connect">
            <Link2 className="h-3.5 w-3.5" />
            Conectar
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="halo-glass rounded-halo p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center border",
            expired
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-emerald-500/10 border-emerald-500/20",
          )}
        >
          <Link2
            className={cn(
              "h-4 w-4",
              expired ? "text-amber-500" : "text-emerald-500",
            )}
          />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium flex items-center gap-2">
            Melhor Envio conectado
            {ambiente === "sandbox" ? (
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                sandbox
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {expired
              ? "Token expirado — reconecte pra renovar o acesso."
              : expiresAt
                ? `Token válido até ${new Date(expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                : "Conexão ativa."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {expired ? (
          <Button asChild size="sm" variant="outline">
            <a href="/api/melhor-envio/connect">Reconectar</a>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleDisconnect}
          disabled={pending}
        >
          <Link2Off className="h-3.5 w-3.5" />
          Desconectar
        </Button>
      </div>
    </div>
  );
}
