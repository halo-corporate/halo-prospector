"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
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
  deleteEtiquetaAction,
  getEtiquetaSignedUrlAction,
  uploadEtiquetaAction,
} from "@/lib/envios/actions";

interface Props {
  envioId: string;
  /** Path no bucket (`etiqueta_url`) — null = sem etiqueta. */
  etiquetaPath: string | null;
}

export function EtiquetaUpload({ envioId, etiquetaPath }: Props) {
  const [pending, startTransition] = useTransition();
  const [opening, setOpening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("arquivo", file);
    startTransition(async () => {
      const res = await uploadEtiquetaAction(envioId, fd);
      if (!res.ok) {
        toast.error(res.message);
      } else {
        toast.success("Etiqueta enviada");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  async function openLabel() {
    setOpening(true);
    try {
      const res = await getEtiquetaSignedUrlAction(envioId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(false);
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEtiquetaAction(envioId);
      if (!res.ok) toast.error(res.message);
      else toast.success("Etiqueta removida");
    });
  }

  return (
    <div className="halo-glass rounded-halo p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
            Etiqueta PDF
          </p>
        </div>
        {etiquetaPath ? (
          <span className="text-[10px] uppercase tracking-wide text-emerald-300/80">
            Anexada
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Nenhuma
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-wrap gap-2">
        {etiquetaPath ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={openLabel}
              disabled={opening || pending}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {opening ? "Abrindo…" : "Abrir / imprimir"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={pickFile}
              disabled={pending}
            >
              <Upload className="h-3.5 w-3.5" />
              Substituir
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:text-destructive"
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover etiqueta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O PDF da etiqueta vai ser excluído permanentemente.
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
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Button size="sm" onClick={pickFile} disabled={pending}>
            <Upload className="h-3.5 w-3.5" />
            {pending ? "Enviando…" : "Enviar PDF"}
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Máx 8 MB. Apenas PDF. Use a etiqueta gerada pelo Melhor Envio ou pela
        transportadora.
      </p>
    </div>
  );
}
