"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém os dados da rota atual em sincronia com o banco.
 *
 * - Assina mudanças (INSERT/UPDATE/DELETE) nas 5 tabelas do projeto via
 *   Supabase Realtime. Em qualquer evento, chama router.refresh() pra
 *   re-fetch dos Server Components da rota atual.
 * - Ao voltar foco pra aba (window.focus / visibilitychange visível),
 *   também faz refresh — fallback se Realtime falhar ou se a aba ficou
 *   inativa por muito tempo.
 * - Debounce de 250ms pra evitar enxurrada de refresh quando uma Server
 *   Action faz várias mutações de uma vez.
 *
 * Renderiza null. É só efeito.
 *
 * NOTA: tudo dentro do contexto da sessão atual. RLS no servidor garante
 * que cada user só recebe eventos das próprias linhas — então mesmo
 * assinando todas as tabelas sem filtro, não vaza dados de outro user.
 */
export function RealtimeRefresher() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel("halo-app-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decisores" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interacoes" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "verticais" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tarefas_semanais" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "propostas" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        scheduleRefresh,
      )
      .subscribe();

    // Fetch on focus — fallback se Realtime cair ou se o user volta da
    // outra aba/dispositivo. Não disparar quando ESTÁ saindo de foco.
    const onFocus = () => scheduleRefresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
