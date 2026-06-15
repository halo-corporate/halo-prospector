"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label="Sair"
      title="Sair"
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
