"use client";

import { useTransition } from "react";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyPendingFromPreviousWeekAction } from "@/lib/tarefas/actions";

export function CopyPendingButton() {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const res = await copyPendingFromPreviousWeekAction();
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.copied === 0) {
        toast.info("Nenhuma pendência na semana anterior.");
      } else {
        toast.success(
          `${res.copied} ${res.copied === 1 ? "tarefa puxada" : "tarefas puxadas"} da semana anterior.`,
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={pending}
    >
      <CopyPlus className="h-3.5 w-3.5" />
      {pending ? "Puxando…" : "Puxar pendentes da semana anterior"}
    </Button>
  );
}
