"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polling do checklist: a cada `intervalMs`, chama router.refresh() pra
 * re-rodar as queries do Server Component (que leem da `tasks` do ALIEN via
 * service-role, atrás do gate de SSO). Sincroniza entre dispositivos sem tocar
 * em RLS e sem novo endpoint.
 *
 * Coexiste com o RealtimeRefresher global (no (app)/layout.tsx): este só
 * ADICIONA o tick periódico; o refresh-on-focus/visibility continua sendo dele.
 * Ambos chamam router.refresh(), que é idempotente — sem conflito.
 *
 * Três guardas:
 *  - anti-atropelo: se o usuário está digitando (activeElement é INPUT/TEXTAREA/
 *    contenteditable), pula o tick pra não sobrescrever drafts em edição.
 *  - eficiência: só refaz com a aba visível.
 *  - cleanup: limpa o interval no unmount.
 */
export function ChecklistPoller({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (isTyping()) return;
      router.refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
