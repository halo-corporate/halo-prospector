"use server";

// ⚠️ TEMPORÁRIO (PASSO 5-B.1) — action de teste SÓ-LEITURA pra provar a ponte
// ALIEN no preview. Não faz insert/update/delete. Remover quando o PASSO 5
// (migração real do checklist) entrar. Funciona só em preview/produção, onde a
// ALIEN_SUPABASE_SERVICE_ROLE_KEY existe — NÃO em localhost.

import { createAlienClient } from "@/lib/supabase/alien-server";

export type TestReadAlienResult =
  | { ok: true; count: number; sample: unknown[] }
  | { ok: false; message: string };

export async function testReadAlienTasks(): Promise<TestReadAlienResult> {
  const alien = createAlienClient();

  // count(*) das tarefas HALO na tasks do ALIEN (head = sem trazer linhas).
  const { count, error: countErr } = await alien
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("system", "HALO");
  if (countErr) return { ok: false, message: `count: ${countErr.message}` };

  // 3 linhas de amostra — select('*') de propósito (não nomeia colunas, pra não
  // depender de semana/stand_by/category_id que ainda não foram confirmadas).
  const { data, error } = await alien
    .from("tasks")
    .select("*")
    .eq("system", "HALO")
    .limit(3);
  if (error) return { ok: false, message: `select: ${error.message}` };

  return { ok: true, count: count ?? 0, sample: data ?? [] };
}
