"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { Embalagem, Envio } from "@/lib/database.types";
import { deleteEnvioAction } from "@/lib/envios/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { EnvioStatusBadge } from "./envio-status-badge";
import { EnvioFormDialog } from "./envio-form-dialog";

interface Props {
  envios: Envio[];
  embalagens: Pick<Embalagem, "id" | "nome">[];
}

export function EnviosTable({ envios, embalagens }: Props) {
  const [pending, startTransition] = useTransition();
  const embalagensById = new Map(embalagens.map((e) => [e.id, e.nome]));

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteEnvioAction(id);
      if (!res.ok) toast.error(res.message);
      else toast.success("Envio excluído");
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
                  <EnvioStatusBadge status={e.status} />
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
