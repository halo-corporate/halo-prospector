import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import { AddTarefaInput } from "@/components/checklist/add-tarefa-input";
import { ChecklistItem } from "@/components/checklist/checklist-item";
import { GerenciarCategoriasDialog } from "@/components/checklist/gerenciar-categorias-dialog";
import { CopyPendingButton } from "./copy-pending-button";
import { TarefasConcluidasDialog } from "./tarefas-concluidas-dialog";
import { ChecklistPoller } from "./checklist-poller";
import {
  listCategorias,
  listTarefasConcluidas,
  listTarefasDaSemana,
} from "@/lib/tarefas/queries";
import type { CategoriaTarefa, TarefaSemanal } from "@/lib/database.types";
import {
  addWeeksISO,
  currentWeekStartBR,
  formatWeekLabelBR,
} from "@/lib/timezone";

export const metadata = { title: "Checklist semanal — HALO Prospector" };
export const dynamic = "force-dynamic";

interface SearchParams {
  semana?: string;
}

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Grupo {
  categoria: CategoriaTarefa | null; // null = "Sem categoria"
  tarefas: TarefaSemanal[];
}

function groupByCategoria(
  tarefas: TarefaSemanal[],
  categorias: CategoriaTarefa[],
): Grupo[] {
  const grupos: Grupo[] = [];
  for (const categoria of categorias) {
    const ts = tarefas.filter((t) => t.categoria_id === categoria.id);
    if (ts.length > 0) grupos.push({ categoria, tarefas: ts });
  }
  const conhecidas = new Set(categorias.map((c) => c.id));
  // "Sem categoria": categoria_id null OU apontando pra categoria inexistente.
  const semCategoria = tarefas.filter(
    (t) => !t.categoria_id || !conhecidas.has(t.categoria_id),
  );
  if (semCategoria.length > 0) {
    grupos.push({ categoria: null, tarefas: semCategoria });
  }
  return grupos;
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const current = currentWeekStartBR();
  const week =
    searchParams.semana && WEEK_RE.test(searchParams.semana)
      ? searchParams.semana
      : current;

  const [todas, tarefasConcluidas, categorias] = await Promise.all([
    listTarefasDaSemana(week),
    listTarefasConcluidas(),
    listCategorias(),
  ]);

  // Separa top-level de subtarefas. Subtarefas (parent_id) ficam aninhadas sob
  // a pai e são indexadas por parent_id (ordenadas por `ordem`).
  const tarefas = todas.filter((t) => !t.parent_id);
  const subtarefasByParent = new Map<string, TarefaSemanal[]>();
  for (const t of todas) {
    if (!t.parent_id) continue;
    const arr = subtarefasByParent.get(t.parent_id) ?? [];
    arr.push(t);
    subtarefasByParent.set(t.parent_id, arr);
  }
  for (const arr of subtarefasByParent.values()) {
    arr.sort((a, b) => a.ordem - b.ordem);
  }

  // Progresso conta só as tarefas top-level.
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const pct = tarefas.length === 0 ? 0 : Math.round((concluidas / tarefas.length) * 100);

  // Agrupa as tarefas por categoria (na ordem das categorias), com "Sem
  // categoria" sempre por último. Categorias vazias não aparecem.
  const grupos = groupByCategoria(tarefas, categorias);

  const isCurrent = week === current;
  const prevWeek = addWeeksISO(week, -1);
  const nextWeek = addWeeksISO(week, 1);

  return (
    <div className="relative">
      {/* Fundo escuro + brilhos azuis sutis: dão profundidade pro glass dos
          cards (o blur precisa de algo atrás pra refratar). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(160deg, #060a11, #0b121d, #0a0f18)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(38% 30% at 18% 0%, rgba(0,113,227,0.07), transparent 70%), radial-gradient(32% 26% at 88% 10%, rgba(91,168,255,0.05), transparent 70%)",
        }}
      />
      <div className="container py-6 space-y-6 max-w-3xl">
      {/* Sincroniza entre dispositivos via tick de 10s (coexiste com o
          RealtimeRefresher global, que cuida do refresh-on-focus). */}
      <ChecklistPoller intervalMs={10000} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center mt-0.5">
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-0.5">
            <p className="halo-eyebrow">Checklist</p>
            <h1 className="title-display text-3xl sm:text-4xl">Checklist semanal</h1>
            <p className="text-sm text-muted-foreground">
              {isCurrent ? "Semana atual" : "Outra semana"} ·{" "}
              {formatWeekLabelBR(week)}
            </p>
            {tarefas.length > 0 ? (
              <div className="flex items-center gap-2 pt-1.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{
                    backdropFilter: "blur(60px) saturate(180%)",
                    WebkitBackdropFilter: "blur(60px) saturate(180%)",
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.25)",
                  }}
                >
                  <span className="font-semibold text-white tabular-nums">
                    {tarefas.length - concluidas}
                  </span>
                  <span className="text-white/50">abertas</span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{
                    backdropFilter: "blur(60px) saturate(180%)",
                    WebkitBackdropFilter: "blur(60px) saturate(180%)",
                    background:
                      "linear-gradient(135deg, rgba(0,113,227,0.22), rgba(0,113,227,0.08))",
                    border: "1px solid rgba(91,168,255,0.4)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)",
                  }}
                >
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: "#7FBEFF" }}
                  >
                    {concluidas}
                  </span>
                  <span className="text-white/50">feitas</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GerenciarCategoriasDialog categorias={categorias} />
          <TarefasConcluidasDialog tarefas={tarefasConcluidas} />
          {isCurrent ? <CopyPendingButton /> : null}
        </div>
      </div>

      {/* Navegação entre semanas */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href={`/checklist?semana=${prevWeek}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {formatWeekLabelBR(prevWeek)}
        </Link>
        {isCurrent ? (
          <span className="text-muted-foreground">Semana atual</span>
        ) : (
          <Link
            href="/checklist"
            className="text-primary hover:underline"
          >
            Voltar pra semana atual
          </Link>
        )}
        <Link
          href={`/checklist?semana=${nextWeek}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {formatWeekLabelBR(nextWeek)} →
        </Link>
      </div>

      {/* Barra de progresso */}
      {tarefas.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>
              {concluidas} de {tarefas.length} concluídas
            </span>
            <span className="font-medium tabular-nums text-primary">{pct}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #0071E3, #7FBEFF)",
                boxShadow: "0 0 16px rgba(0,113,227,0.8)",
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Barra de adicionar tarefa (vidro) */}
      <div className="halo-glass rounded-[14px] p-3">
        <AddTarefaInput weekStartISO={week} />
      </div>

      {tarefas.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">
          Nenhuma tarefa nessa semana. Adicione a primeira aí em cima.
        </p>
      ) : grupos.length === 1 && grupos[0]!.categoria === null ? (
        // Sem categorias atribuídas: lista plana (sem cabeçalho de grupo).
        <div className="space-y-2">
          {tarefas.map((t) => (
            <ChecklistItem
              key={t.id}
              tarefa={t}
              categorias={categorias}
              subtarefas={subtarefasByParent.get(t.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.categoria?.id ?? "sem-categoria"} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: g.categoria?.cor ?? "transparent",
                    boxShadow: g.categoria?.cor
                      ? `0 0 8px ${g.categoria.cor}80`
                      : undefined,
                    border: g.categoria
                      ? undefined
                      : "1px solid rgba(255,255,255,0.3)",
                  }}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                  {g.categoria?.nome ?? "Sem categoria"}
                </span>
                <span className="text-[11px] tabular-nums text-white/30">
                  {g.tarefas.length}
                </span>
              </div>
              <div className="space-y-2">
                {g.tarefas.map((t) => (
                  <ChecklistItem
                    key={t.id}
                    tarefa={t}
                    categorias={categorias}
                    subtarefas={subtarefasByParent.get(t.id) ?? []}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
