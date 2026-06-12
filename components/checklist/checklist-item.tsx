"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Edit2,
  FileText,
  Flame,
  ListTree,
  PauseCircle,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubtarefaAction,
  deleteTarefaAction,
  setTarefaCategoriaAction,
  toggleStandByTarefaAction,
  toggleTarefaAction,
  updateTarefaObservacoesAction,
  updateTarefaPrazoAction,
  updateTarefaPrioridadeAction,
  updateTarefaTextoAction,
} from "@/lib/tarefas/actions";
import {
  TAREFA_PRIORIDADE_CICLO,
  TAREFA_PRIORIDADE_LABELS,
  type CategoriaTarefa,
  type TarefaSemanal,
} from "@/lib/database.types";
import {
  deadlineGlowClass,
  deadlineProximity,
  prioridadeChipClass,
} from "@/lib/tarefas/prazo";
import { formatBR, fromBRInput, toDateTimeLocalBR } from "@/lib/timezone";

interface Props {
  tarefa: TarefaSemanal;
  /** Se true, esconde botão de editar/excluir e o card de observações (modo compacto pro dashboard). */
  compact?: boolean;
  /** Categorias disponíveis pro seletor por tarefa (modo completo). */
  categorias?: CategoriaTarefa[];
  /** Subtarefas (filhas) dessa tarefa, já ordenadas. Só renderizadas no modo completo. */
  subtarefas?: TarefaSemanal[];
}

export function ChecklistItem({
  tarefa,
  compact = false,
  categorias = [],
  subtarefas = [],
}: Props) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tarefa.texto);

  // Observações: visível por default se já há conteúdo; senão, retraído.
  const [obsOpen, setObsOpen] = useState(Boolean(tarefa.observacoes));
  const [obsEditing, setObsEditing] = useState(false);
  const [obsDraft, setObsDraft] = useState(tarefa.observacoes ?? "");
  const obsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Prazo (deadline): editor inline com <input type="datetime-local">.
  const [prazoEditing, setPrazoEditing] = useState(false);

  // Subtarefas: input inline pra adicionar uma filha.
  const [subAdding, setSubAdding] = useState(false);
  const [subDraft, setSubDraft] = useState("");

  const subConcluidas = subtarefas.filter((s) => s.concluida).length;

  // Sincroniza drafts quando a tarefa vier nova/atualizada (router.refresh).
  useEffect(() => {
    setDraft(tarefa.texto);
  }, [tarefa.texto]);
  useEffect(() => {
    setObsDraft(tarefa.observacoes ?? "");
  }, [tarefa.observacoes]);

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleTarefaAction(tarefa.id, !tarefa.concluida);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleToggleStandBy() {
    startTransition(async () => {
      const res = await toggleStandByTarefaAction(tarefa.id, !tarefa.stand_by);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleCyclePrioridade() {
    const idx = TAREFA_PRIORIDADE_CICLO.indexOf(tarefa.prioridade);
    const next =
      TAREFA_PRIORIDADE_CICLO[(idx + 1) % TAREFA_PRIORIDADE_CICLO.length]!;
    startTransition(async () => {
      const res = await updateTarefaPrioridadeAction(tarefa.id, next);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleSavePrazo(localValue: string) {
    // localValue vem de <input type="datetime-local"> (hora BR). Converte p/ UTC.
    const iso = localValue ? fromBRInput(localValue).toISOString() : null;
    startTransition(async () => {
      const res = await updateTarefaPrazoAction(tarefa.id, iso);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPrazoEditing(false);
      toast.success(iso ? "Prazo definido" : "Prazo removido");
    });
  }

  function handleClearPrazo() {
    startTransition(async () => {
      const res = await updateTarefaPrazoAction(tarefa.id, null);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPrazoEditing(false);
      toast.success("Prazo removido");
    });
  }

  function handleSetCategoria(categoriaId: string | null) {
    startTransition(async () => {
      const res = await setTarefaCategoriaAction(tarefa.id, categoriaId);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleAddSubtarefa() {
    const t = subDraft.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await createSubtarefaAction(tarefa.id, t);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setSubDraft("");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTarefaAction(tarefa.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleSaveEdit() {
    const t = draft.trim();
    if (!t || t === tarefa.texto) {
      setEditing(false);
      setDraft(tarefa.texto);
      return;
    }
    startTransition(async () => {
      const res = await updateTarefaTextoAction(tarefa.id, t);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setEditing(false);
    });
  }

  function handleCancelEdit() {
    setEditing(false);
    setDraft(tarefa.texto);
  }

  function openObsEditor() {
    setObsOpen(true);
    setObsEditing(true);
    setObsDraft(tarefa.observacoes ?? "");
    // Focar com pequeno delay pra esperar o render do textarea
    setTimeout(() => obsTextareaRef.current?.focus(), 30);
  }

  function handleSaveObs() {
    const next = obsDraft.trim();
    const original = (tarefa.observacoes ?? "").trim();
    if (next === original) {
      setObsEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateTarefaObservacoesAction(
        tarefa.id,
        next.length === 0 ? null : next,
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setObsEditing(false);
      if (next.length === 0) setObsOpen(false);
      toast.success(
        next.length === 0 ? "Observação removida" : "Observação salva",
      );
    });
  }

  function handleCancelObs() {
    setObsEditing(false);
    setObsDraft(tarefa.observacoes ?? "");
  }

  const hasObs = Boolean(tarefa.observacoes);

  return (
    <div
      className={cn(
        "group rounded-md border border-transparent px-2 py-1.5 -mx-2 transition-colors",
        !editing && !obsEditing && "hover:border-border hover:bg-accent/30",
        tarefa.stand_by && !tarefa.concluida && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending || editing || obsEditing}
          aria-label={
            tarefa.concluida ? "Marcar como pendente" : "Marcar como concluída"
          }
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
            tarefa.concluida
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-foreground",
            pending && "opacity-50",
          )}
        >
          {tarefa.concluida ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : null}
        </button>

        {!compact ? (
          <button
            type="button"
            onClick={handleToggleStandBy}
            disabled={pending || editing || obsEditing}
            aria-label={
              tarefa.stand_by ? "Sair do stand by" : "Marcar como stand by"
            }
            title={tarefa.stand_by ? "Stand by — clique pra ativar" : "Stand by"}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center transition-colors",
              tarefa.stand_by
                ? "text-amber-500"
                : "text-muted-foreground/40 hover:text-foreground",
              pending && "opacity-50",
            )}
          >
            <PauseCircle className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {editing ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              autoFocus
              maxLength={200}
              className="h-7 text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleSaveEdit}
              disabled={pending}
              aria-label="Salvar"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleCancelEdit}
              disabled={pending}
              aria-label="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {compact ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-medium uppercase tracking-wide leading-none shrink-0",
                      prioridadeChipClass(tarefa.prioridade),
                    )}
                  >
                    {tarefa.prioridade === "alta" ? (
                      <Flame className="h-2.5 w-2.5" />
                    ) : null}
                    {TAREFA_PRIORIDADE_LABELS[tarefa.prioridade]}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleCyclePrioridade}
                    disabled={pending}
                    aria-label={`Prioridade ${TAREFA_PRIORIDADE_LABELS[tarefa.prioridade]} — clique pra alternar`}
                    title="Clique pra alternar prioridade (alta → média → baixa)"
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide leading-none shrink-0 transition-colors hover:opacity-80",
                      prioridadeChipClass(tarefa.prioridade),
                      pending && "opacity-50",
                    )}
                  >
                    {tarefa.prioridade === "alta" ? (
                      <Flame className="h-2.5 w-2.5" />
                    ) : null}
                    {TAREFA_PRIORIDADE_LABELS[tarefa.prioridade]}
                  </button>
                )}

                {/* Chip de prazo (read-only) — exibido inline quando há prazo.
                    O glow de proximidade é a sinalização visual principal. */}
                {tarefa.prazo ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium leading-none shrink-0",
                      deadlineGlowClass(
                        deadlineProximity(tarefa.prazo),
                      ) || "bg-muted text-muted-foreground",
                      tarefa.concluida && "opacity-50 saturate-0",
                    )}
                    title={`Prazo: ${formatBR(tarefa.prazo)}`}
                  >
                    <CalendarClock className="h-2.5 w-2.5" />
                    {formatBR(tarefa.prazo, "dd/MM HH:mm")}
                  </span>
                ) : null}

                {/* Contador de subtarefas */}
                {!compact && subtarefas.length > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium leading-none shrink-0 bg-muted text-muted-foreground"
                    title={`${subConcluidas} de ${subtarefas.length} subtarefas concluídas`}
                  >
                    <ListTree className="h-2.5 w-2.5" />
                    {subConcluidas}/{subtarefas.length}
                  </span>
                ) : null}

                <p
                  className={cn(
                    "text-sm leading-snug flex-1 min-w-0",
                    tarefa.concluida && "line-through text-muted-foreground",
                    tarefa.stand_by && !tarefa.concluida && "italic text-muted-foreground",
                  )}
                >
                  {tarefa.texto}
                </p>
                {/* Indicador de observação no modo compact */}
                {compact && hasObs ? (
                  <StickyNote
                    className="h-3 w-3 text-primary shrink-0"
                    aria-label="Tem observações"
                  />
                ) : null}
              </div>

              {/* Meta: observações + prazo (só modo completo) */}
              {!compact ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (obsEditing) return;
                      if (!obsOpen && !hasObs) {
                        openObsEditor();
                      } else {
                        setObsOpen((o) => !o);
                      }
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors",
                      hasObs ? "" : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {obsOpen ? (
                      <ChevronDown className="h-2.5 w-2.5" />
                    ) : (
                      <ChevronRight className="h-2.5 w-2.5" />
                    )}
                    {hasObs ? (
                      <span>
                        <FileText className="inline h-2.5 w-2.5 -mt-px mr-0.5" />
                        Observações
                      </span>
                    ) : (
                      <span>+ Adicionar observação</span>
                    )}
                  </button>

                  {/* Prazo: botão pra abrir o editor (datetime-local) */}
                  {!prazoEditing ? (
                    <button
                      type="button"
                      onClick={() => setPrazoEditing(true)}
                      disabled={pending}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors",
                        tarefa.prazo ? "" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <CalendarClock className="h-2.5 w-2.5" />
                      {tarefa.prazo ? "Editar prazo" : "+ Definir prazo"}
                    </button>
                  ) : null}

                  {/* Categoria: seletor nativo (só se houver categorias) */}
                  {categorias.length > 0 ? (
                    <select
                      value={tarefa.categoria_id ?? ""}
                      onChange={(e) =>
                        handleSetCategoria(e.target.value || null)
                      }
                      disabled={pending}
                      aria-label="Categoria da tarefa"
                      className={cn(
                        "h-5 rounded border border-input bg-transparent px-1 text-[10px] leading-none text-muted-foreground/80 hover:text-foreground transition-colors max-w-[140px]",
                        tarefa.categoria_id
                          ? ""
                          : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      )}
                    >
                      <option value="">Sem categoria</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {/* + Subtarefa */}
                  <button
                    type="button"
                    onClick={() => setSubAdding((v) => !v)}
                    disabled={pending}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors",
                      subtarefas.length > 0
                        ? ""
                        : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Subtarefa
                  </button>
                </div>
              ) : null}

              {/* Editor de prazo inline */}
              {!compact && prazoEditing ? (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <input
                    type="datetime-local"
                    defaultValue={
                      tarefa.prazo ? toDateTimeLocalBR(tarefa.prazo) : ""
                    }
                    autoFocus
                    disabled={pending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSavePrazo((e.target as HTMLInputElement).value);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setPrazoEditing(false);
                      }
                    }}
                    id={`prazo-${tarefa.id}`}
                    className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pending}
                    onClick={() => {
                      const el = document.getElementById(
                        `prazo-${tarefa.id}`,
                      ) as HTMLInputElement | null;
                      handleSavePrazo(el?.value ?? "");
                    }}
                  >
                    Salvar
                  </Button>
                  {tarefa.prazo ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs hover:text-destructive"
                      disabled={pending}
                      onClick={handleClearPrazo}
                    >
                      Remover
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={pending}
                    onClick={() => setPrazoEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : null}
            </div>

            {!compact ? (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                  aria-label="Editar texto"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:text-destructive"
                  onClick={handleDelete}
                  disabled={pending}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Subtarefas (aninhadas) — só no modo completo */}
      {!compact && !editing && (subtarefas.length > 0 || subAdding) ? (
        <div className="mt-1 ml-6 space-y-0.5 border-l border-border/50 pl-2">
          {subtarefas.map((sub) => (
            <SubtarefaRow key={sub.id} sub={sub} />
          ))}
          {subAdding ? (
            <div className="flex items-center gap-1 pt-0.5">
              <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <Input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtarefa();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setSubAdding(false);
                    setSubDraft("");
                  }
                }}
                autoFocus
                maxLength={200}
                placeholder="Nova subtarefa…"
                disabled={pending}
                className="h-7 flex-1 text-xs"
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddSubtarefa}
                disabled={pending || !subDraft.trim()}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setSubAdding(false);
                  setSubDraft("");
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Card de observações — só no modo completo */}
      {!compact && obsOpen && !editing ? (
        <div className="mt-2 ml-6 rounded-md border border-border/60 bg-card/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Observações</span>
            </div>
            {!obsEditing ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={openObsEditor}
                disabled={pending}
                aria-label={hasObs ? "Editar observações" : "Adicionar observações"}
              >
                <Edit2 className="h-2.5 w-2.5" />
              </Button>
            ) : null}
          </div>

          {obsEditing ? (
            <div className="space-y-1.5">
              <Textarea
                ref={obsTextareaRef}
                value={obsDraft}
                onChange={(e) => setObsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSaveObs();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelObs();
                  }
                }}
                rows={3}
                maxLength={1000}
                placeholder="Contexto, dados pra revisar, links, etc."
                className="text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {obsDraft.length}/1000 · ⌘+Enter salva · Esc cancela
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={handleCancelObs}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleSaveObs}
                    disabled={pending}
                  >
                    {pending ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : hasObs ? (
            <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words leading-snug">
              {tarefa.observacoes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma observação ainda.{" "}
              <button
                type="button"
                onClick={openObsEditor}
                className="underline hover:text-foreground"
              >
                Adicionar
              </button>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Linha de uma subtarefa: toggle + texto + excluir (aparece no hover). */
function SubtarefaRow({ sub }: { sub: TarefaSemanal }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleTarefaAction(sub.id, !sub.concluida);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTarefaAction(sub.id);
      if (!res.ok) toast.error(res.message);
    });
  }

  return (
    <div className="group/sub flex items-center gap-2 py-0.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-label={
          sub.concluida ? "Marcar como pendente" : "Marcar como concluída"
        }
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center transition-colors",
          sub.concluida
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-foreground",
          pending && "opacity-50",
        )}
      >
        {sub.concluida ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </button>
      <p
        className={cn(
          "flex-1 min-w-0 text-xs leading-snug",
          sub.concluida && "line-through text-muted-foreground",
        )}
      >
        {sub.texto}
      </p>
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5 shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity hover:text-destructive"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Excluir subtarefa"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
