"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ENVIO_STATUSES,
  ENVIO_STATUS_LABELS,
  type Embalagem,
  type Envio,
  type EnvioStatus,
  type Influencer,
} from "@/lib/database.types";
import {
  deleteEnvioAction,
  updateEnvioStatusAction,
} from "@/lib/envios/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { EnvioStatusBadge } from "./envio-status-badge";
import { EnvioFormDialog } from "./envio-form-dialog";

interface Props {
  envios: Envio[];
  embalagens: Pick<Embalagem, "id" | "nome">[];
  influencers?: Pick<Influencer, "id" | "nome">[];
  melhorEnvioConectado?: boolean;
  fromCepDefault?: string;
}

export function EnviosTable({
  envios,
  embalagens,
  influencers = [],
  melhorEnvioConectado = false,
  fromCepDefault = "",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const embalagensById = new Map(embalagens.map((e) => [e.id, e.nome]));

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteEnvioAction(id);
      if (!res.ok) toast.error(res.message);
      else toast.success("Envio excluído");
    });
  }

  function handleStatusChange(id: string, status: EnvioStatus) {
    setPendingId(id);
    startTransition(async () => {
      const res = await updateEnvioStatusAction(id, status);
      setPendingId(null);
      if (res.ok) router.refresh();
      else toast.error(res.message);
    });
  }

  if (envios.length === 0) {
    return (
      <div className="halo-glass rounded-halo p-8 text-center text-sm text-muted-foreground">
        Nenhum envio encontrado.
      </div>
    );
  }

  return (
    <div className="halo-glass rounded-halo">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap">Destinatário</TableHead>
            <TableHead className="whitespace-nowrap">Cidade/UF</TableHead>
            <TableHead className="whitespace-nowrap">Embalagem</TableHead>
            <TableHead className="whitespace-nowrap">Rastreio</TableHead>
            <TableHead className="whitespace-nowrap">Postagem</TableHead>
            <TableHead className="whitespace-nowrap text-right">
              Frete
            </TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {envios.map((e) => {
            const cidadeUf = [
              e.endereco_destino?.cidade,
              e.endereco_destino?.uf,
            ]
              .filter(Boolean)
              .join("/");
            return (
              <TableRow key={e.id} className={pending ? "opacity-50" : ""}>
                <TableCell>
                  {/* Badge visível + select nativo por cima (opacity-0) captura o
                      clique pra trocar status inline. stopPropagation pra não
                      vazar pra eventuais cliques da linha. */}
                  <div
                    className={cn(
                      "relative inline-flex",
                      pendingId === e.id && "opacity-50",
                    )}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <EnvioStatusBadge status={e.status} />
                    <select
                      value={e.status}
                      disabled={pendingId === e.id}
                      onChange={(ev) =>
                        handleStatusChange(
                          e.id,
                          ev.target.value as EnvioStatus,
                        )
                      }
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label="Trocar status do envio"
                      className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
                    >
                      {ENVIO_STATUSES.map((s) => (
                        <option
                          key={s}
                          value={s}
                          className="bg-background text-foreground"
                        >
                          {ENVIO_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/envios/${e.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {e.destinatario_nome}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {cidadeUf || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {e.embalagem_id
                    ? embalagensById.get(e.embalagem_id) ?? "—"
                    : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {e.tracking_url && e.codigo_rastreio ? (
                    <a
                      href={e.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {e.codigo_rastreio}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    e.codigo_rastreio ?? "—"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateBR(e.data_postagem)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {e.valor_frete != null ? formatBRL(e.valor_frete) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <EnvioFormDialog
                      mode="edit"
                      envio={e}
                      embalagens={embalagens}
                      influencers={influencers}
                      melhorEnvioConectado={melhorEnvioConectado}
                      fromCepDefault={fromCepDefault}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:text-destructive"
                          disabled={pending}
                          aria-label="Excluir envio"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir envio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O envio para{" "}
                            <strong className="text-foreground">
                              {e.destinatario_nome}
                            </strong>{" "}
                            vai ser removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(ev) => {
                              ev.preventDefault();
                              handleDelete(e.id);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
