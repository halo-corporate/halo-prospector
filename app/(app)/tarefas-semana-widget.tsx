import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import { ChecklistItem } from "@/components/checklist/checklist-item";
import { AddTarefaInput } from "@/components/checklist/add-tarefa-input";
import { listTarefasDaSemana } from "@/lib/tarefas/queries";
import { currentWeekStartBR, formatWeekLabelBR } from "@/lib/timezone";

/**
 * Mini-checklist da semana atual exibido no dashboard. Mostra até 6 itens;
 * link "Ver tudo" leva pra /checklist.
 */
export async function TarefasSemanaWidget() {
  const week = currentWeekStartBR();
  const tarefas = await listTarefasDaSemana(week);
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const visiveis = tarefas.slice(0, 6);

  return (
    <section className="halo-glass rounded-halo p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium tracking-wide">
            Checklist da semana
          </h2>
          <span className="text-xs text-muted-foreground">
            · {formatWeekLabelBR(week)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{concluidas}</strong>/{tarefas.length}{" "}
            concluídas
          </span>
          <Link href="/checklist" className="text-primary hover:underline">
            Ver tudo
          </Link>
        </div>
      </div>

      <AddTarefaInput weekStartISO={week} placeholder="O que você precisa fazer essa semana?" />

      {tarefas.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Sem tarefas registradas pra essa semana ainda.
        </p>
      ) : (
        <div className="space-y-0.5">
          {visiveis.map((t) => (
            <ChecklistItem key={t.id} tarefa={t} compact />
          ))}
          {tarefas.length > visiveis.length ? (
            <Link
              href="/checklist"
              className="block text-xs text-muted-foreground hover:text-foreground py-1.5 px-2"
            >
              + {tarefas.length - visiveis.length} outras tarefas…
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
