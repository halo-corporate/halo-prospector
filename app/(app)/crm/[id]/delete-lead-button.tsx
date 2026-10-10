"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLeadAction } from "@/lib/leads/actions";
import { toast } from "sonner";

interface DeleteLeadButtonProps {
  leadId: string;
  label?: string;
}

export function DeleteLeadButton({ leadId, label = "Excluir lead" }: DeleteLeadButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    startTransition(async () => {
      try {
        await deleteLeadAction(leadId);
        toast.success("Lead excluído");
        router.push("/crm");
      } catch {
        toast.error("Erro ao excluir lead");
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {pending ? "Excluindo..." : label}
    </Button>
  );
}
