"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteComprovanteAction,
  getComprovanteSignedUrlAction,
  uploadComprovanteAction,
} from "@/lib/financeiro/actions";

const ALLOWED_MIMES_CLIENT = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  vendaId: string;
  /** Path no storage (não URL completa). null/empty = sem comprovante. */
  comprovanteUrl: string | null;
}

export function ComprovanteCell({ vendaId, comprovanteUrl }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [openingUrl, setOpeningUrl] = useState(false);
  const hasFile = Boolean(comprovanteUrl);

  function handlePickFile() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Limpa o input pra permitir re-upload do mesmo arquivo
    e.target.value = "";
    if (!file) return;

    if (
      !ALLOWED_MIMES_CLIENT.includes(
        file.type as (typeof ALLOWED_MIMES_CLIENT)[number],
      )
    ) {
      toast.error("Tipo não suportado. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande (máx 5 MB).");
      return;
    }

    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadComprovanteAction(vendaId, fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Comprovante enviado");
    });
  }

  function handleOpen() {
    if (!comprovanteUrl) return;
    setOpeningUrl(true);
    // Abre uma aba IMEDIATAMENTE (precisa ser dentro do click handler pro
    // popup blocker não bloquear) e seta a URL depois que o signed vier.
    const win = window.open("about:blank", "_blank", "noopener,noreferrer");
    getComprovanteSignedUrlAction(comprovanteUrl)
      .then((res) => {
        if (!res.ok) {
          toast.error(res.message);
          win?.close();
          return;
        }
        if (win) {
          win.location.href = res.url;
        } else {
          // Popup blocker bloqueou; fallback abre na mesma tab
          toast.info("Permita popups pra abrir em nova aba.");
          window.location.href = res.url;
        }
      })
      .finally(() => setOpeningUrl(false));
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteComprovanteAction(vendaId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Comprovante removido");
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleFileChange}
        disabled={pending}
      />

      {hasFile ? (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-primary"
            onClick={handleOpen}
            disabled={pending || openingUrl}
            aria-label="Abrir comprovante"
            title="Abrir comprovante em nova aba"
          >
            {openingUrl ? (
              <ExternalLink className="h-3 w-3 animate-pulse" />
            ) : (
              <Paperclip className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handlePickFile}
            disabled={pending}
            aria-label="Trocar comprovante"
            title="Trocar arquivo"
          >
            <Upload className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-6 w-6 text-muted-foreground hover:text-destructive",
              "opacity-0 group-hover/row:opacity-100 transition-opacity",
            )}
            onClick={handleDelete}
            disabled={pending}
            aria-label="Remover comprovante"
            title="Remover comprovante"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handlePickFile}
          disabled={pending}
          aria-label="Anexar comprovante"
          title="Anexar comprovante (PDF/JPG/PNG, máx 5 MB)"
        >
          <Upload className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
