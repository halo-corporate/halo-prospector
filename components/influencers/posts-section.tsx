"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPostUrlAction,
  removePostUrlAction,
} from "@/lib/influencers/actions";

interface Props {
  influencerId: string;
  postsUrl: string[];
}

export function PostsSection({ influencerId, postsUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");

  function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Cole a URL do post");
      return;
    }
    startTransition(async () => {
      const res = await addPostUrlAction(influencerId, trimmed);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Post adicionado");
      setUrl("");
    });
  }

  function handleRemove(target: string) {
    startTransition(async () => {
      const res = await removePostUrlAction(influencerId, target);
      if (!res.ok) toast.error(res.message);
      else toast.success("Post removido");
    });
  }

  return (
    <div className="halo-glass rounded-halo p-4 space-y-3">
      <p className="font-display font-bold uppercase tracking-[0.04em] text-sm">
        Posts publicados
      </p>

      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/p/…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          disabled={pending}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={pending || !url.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>

      {postsUrl.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center">
          Nenhum post registrado.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {postsUrl.map((u) => (
            <li
              key={u}
              className="group flex items-center gap-2 rounded-md border border-white/10 px-3 py-2"
            >
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline truncate"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{u}</span>
              </a>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(u)}
                disabled={pending}
                title="Remover post"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
