"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
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

/** Cor da prioridade no modo completo (bolinha + texto na linha de metadados). */
const PRIO_COLOR: Record<TarefaSemanal["prioridade"], string> = {
  alta: "#FF7A7A",
  media: "#FFC061",
  baixa: "#7FE3A0",
};

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

  // Anim 1 (completar): saída suave do card antes do revalidate remover a tarefa.
  const [isExiting, setIsExiting] = useState(false);
  const [exitMaxH, setExitMaxH] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Anim 3 (subtarefas): toggle visual de expandir/colapsar (default aberto).
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const subListRef = useRef<HTMLDivElement | null>(null);
  const [subMaxH, setSubMaxH] = useState<number | undefined>(undefined);

  const subConcluidas = subtarefas.filter((s) => s.concluida).length;
  const hasSub = !compact && subtarefas.length > 0;
  const overdue =
    !compact && tarefa.prazo
      ? deadlineProximity(tarefa.prazo) === "overdue"
      : false;
  const overdueLabel =
    overdue && tarefa.prazo ? overdueDaysLabel(tarefa.prazo) : "";

  // Estado "marcada" visual: no modo full, durante a saída (isExiting) já
  // mostramos o check, mesmo antes do revalidate confirmar concluida.
  const checked = compact ? tarefa.concluida : tarefa.concluida || isExiting;
  const collapsed = isExiting && exitMaxH === 0;

  // Sincroniza drafts quando a tarefa vier nova/atualizada (router.refresh).
  useEffect(() => {
    setDraft(tarefa.texto);
  }, [tarefa.texto]);
  useEffect(() => {
    setObsDraft(tarefa.observacoes ?? "");
  }, [tarefa.observacoes]);

  // Mantém a altura do bloco de subtarefas em sincronia pro collapse animar
  // suave (mede o conteúdo real; recalcula ao abrir/fechar ou mudar a lista).
  useEffect(() => {
    const el = subListRef.current;
    if (!el) return;
    setSubMaxH(subtasksOpen ? el.scrollHeight : 0);
  }, [subtasksOpen, subtarefas.length]);

  function handleToggle() {
    // Compact OU desmarcar (feita → pendente): comportamento original, sem saída.
    if (compact || tarefa.concluida) {
      startTransition(async () => {
        const res = await toggleTarefaAction(tarefa.id, !tarefa.concluida);
        if (!res.ok) toast.error(res.message);
      });
      return;
    }
    // Full + completar: roda a animação de saída (~400ms) ANTES de disparar a
    // action, pra a tarefa deslizar pra fora antes do revalidate removê-la.
    const h = cardRef.current?.scrollHeight ?? 0;
    setExitMaxH(h); // trava a altura atual…
    setIsExiting(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setExitMaxH(0)),
    ); // …e colapsa no próximo frame pra o max-height animar
    setTimeout(() => {
      startTransition(async () => {
        const res = await toggleTarefaAction(tarefa.id, true);
        if (!res.ok) {
          toast.error(res.message);
          setIsExiting(false); // falhou: reverte a saída
          setExitMaxH(null);
        }
      });
    }, 420);
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

  // Nome da categoria (só leitura) pra linha de metadados no modo completo.
  const categoriaNome =
    !compact && tarefa.categoria_id
      ? (categorias.find((c) => c.id === tarefa.categoria_id)?.nome ?? null)
      : null;

  // Glass limpo/uniforme (só modo completo). Fundo e borda ficam em classes
  // Tailwind (pra ter variação no :hover); aqui só blur, raio e sombras.
  // Card com subtarefas é azulado (ver className do card).
  const cardStyle: CSSProperties | undefined = compact
    ? undefined
    : {
        backdropFilter: "blur(40px) saturate(160%)",
        WebkitBackdropFilter: "blur(40px) saturate(160%)",
        borderRadius: "18px",
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.15), 0 8px 24px rgba(0,0,0,0.28)",
      };

  // Isola o conteúdo da camada de composição do backdrop-filter: translateZ(0)
  // + isolation força uma layer própria pro texto não herdar o desfoque do
  // vidro (bug clássico de composição). Antialiasing explícito pra nitidez.
  const contentStyle: CSSProperties | undefined = compact
    ? undefined
    : {
        transform: "translateZ(0)",
        isolation: "isolate",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      };

  // Título dominante (só modo completo): grande, sólido, nítido.
  const titleStyle: CSSProperties | undefined = compact
    ? undefined
    : {
        fontSize: "16px",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      };

  // Anim 1: saída do card ao completar — primeiro esmaece (opacity 0.5), depois
  // colapsa (max-height/padding/margin → 0) + desliza (translateX). Só full.
  const exitStyle: CSSProperties = isExiting
    ? {
        maxHeight: exitMaxH ?? undefined,
        opacity: collapsed ? 0 : 0.5,
        transform: collapsed ? "translateX(16px)" : undefined,
        paddingTop: collapsed ? 0 : undefined,
        paddingBottom: collapsed ? 0 : undefined,
        marginTop: collapsed ? 0 : undefined,
        transition:
          "max-height 400ms ease, opacity 360ms ease, transform 400ms ease, padding 400ms ease, margin 400ms ease",
      }
    : {};

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative transition-all",
        compact
          ? cn(
              "rounded-md border border-transparent px-2 py-1.5 -mx-2",
              !editing &&
                !obsEditing &&
                "hover:border-border hover:bg-accent/30",
            )
          : cn(
              "overflow-hidden border px-3.5 py-3",
              hasSub
                ? "bg-[rgba(0,113,227,0.1)] border-[rgba(91,168,255,0.35)] hover:bg-[rgba(0,113,227,0.14)] hover:border-[rgba(91,168,255,0.5)]"
                : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.22)]",
            ),
        tarefa.concluida && "opacity-50",
        tarefa.stand_by && !tarefa.concluida && "opacity-70",
      )}
      style={{ ...cardStyle, ...exitStyle }}
    >
      {/* Reflexo de linha no topo do vidro (só modo completo) */}
      {!compact ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: hasSub
              ? "linear-gradient(90deg, transparent, rgba(127,190,255,0.6), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
          }}
        />
      ) : null}

      <div className="relative flex items-start gap-2" style={contentStyle}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending || editing || obsEditing || isExiting}
          aria-label={
            tarefa.concluida ? "Marcar como pendente" : "Marcar como concluída"
          }
          className={cn(
            "mt-0.5 shrink-0 rounded-full border flex items-center justify-center transition-all",
            compact ? "h-4 w-4" : "h-5 w-5",
            checked
              ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(0,113,227,0.5)]"
              : "border-white/30 hover:border-white/70",
            pending && "opacity-50",
          )}
        >
          {compact ? (
            tarefa.concluida ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : null
          ) : (
            // Anim 1: o check entra com scale 0→1 + fade (~200ms).
            <span
              className={cn(
                "flex items-center justify-center transition-all duration-200 ease-out",
                checked ? "scale-100 opacity-100" : "scale-0 opacity-0",
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
        </button>

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
        ) : compact ? (
          /* ----- MODO COMPACT (widget da Home) — inalterado ----- */
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center flex-wrap gap-1.5">
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

              {tarefa.prazo ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium leading-none shrink-0",
                    deadlineGlowClass(deadlineProximity(tarefa.prazo)) ||
                      "bg-muted text-muted-foreground",
                    tarefa.concluida && "opacity-50 saturate-0",
                  )}
                  title={`Prazo: ${formatBR(tarefa.prazo)}`}
                >
                  <CalendarClock className="h-2.5 w-2.5" />
                  {formatBR(tarefa.prazo, "dd/MM HH:mm")}
                </span>
              ) : null}

              <p
                className={cn(
                  "text-sm leading-snug flex-1 min-w-0",
                  tarefa.concluida && "line-through text-muted-foreground",
                  tarefa.stand_by &&
                    !tarefa.concluida &&
                    "italic text-muted-foreground",
                )}
              >
                {tarefa.texto}
              </p>
              {hasObs ? (
                <StickyNote
                  className="h-3 w-3 text-primary shrink-0"
                  aria-label="Tem observações"
                />
              ) : null}
            </div>
          </div>
        ) : (
          /* ----- MODO COMPLETO ----- */
          <div className="flex-1 min-w-0">
            {/* Linha 1: título dominante + contador de subtarefas colado;
                chip de atraso isolado à direita. */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                <p
                  className={cn(
                    "leading-snug min-w-0 transition-colors duration-200",
                    !checked && !tarefa.stand_by && "text-white",
                    checked && "line-through text-muted-foreground",
                    tarefa.stand_by && !checked && "italic text-muted-foreground",
                  )}
                  style={titleStyle}
                >
                  {tarefa.texto}
                </p>
                {subtarefas.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSubtasksOpen((v) => !v)}
                    className="inline-flex items-center gap-1 font-medium leading-none shrink-0 transition-opacity hover:opacity-80"
                    style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "8px",
                      color: "#7FBEFF",
                      background: "rgba(127,190,255,0.18)",
                      border: "1px solid rgba(127,190,255,0.3)",
                    }}
                    aria-expanded={subtasksOpen}
                    title={
                      subtasksOpen ? "Recolher subtarefas" : "Expandir subtarefas"
                    }
                  >
                    <ListTree className="h-3 w-3" />
                    {subConcluidas} / {subtarefas.length}
                    <ChevronDown
                      className="h-3 w-3 transition-transform duration-300"
                      style={{
                        transform: subtasksOpen
                          ? "rotate(0deg)"
                          : "rotate(180deg)",
                      }}
                    />
                  </button>
                ) : null}
              </div>

              {overdue ? (
                <span
                  className="inline-flex items-center font-semibold leading-none shrink-0"
                  style={{
                    fontSize: "11px",
                    padding: "5px 11px",
                    borderRadius: "9px",
                    color: "#FF7A7A",
                    background: "rgba(255,107,107,0.12)",
                    border: "1px solid rgba(255,107,107,0.28)",
                  }}
                  title={`Vencida — prazo ${formatBR(tarefa.prazo!)}`}
                >
                  {overdueLabel}
                </span>
              ) : null}
            </div>

            {/* Linha 2: metadados discretos — prioridade (dot+texto, clicável
                pra ciclar) · prazo · categoria. */}
            <div
              className="flex items-center flex-wrap gap-1.5"
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.42)",
              }}
            >
              <button
                type="button"
                onClick={handleCyclePrioridade}
                disabled={pending}
                aria-label={`Prioridade ${TAREFA_PRIORIDADE_LABELS[tarefa.prioridade]} — clique pra alternar`}
                title="Clique pra alternar prioridade (alta → média → baixa)"
                className={cn(
                  "inline-flex items-center gap-1.5 leading-none transition-opacity hover:opacity-70",
                  pending && "opacity-50",
                )}
              >
                <span
                  aria-hidden
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "9999px",
                    background: PRIO_COLOR[tarefa.prioridade],
                    boxShadow: `0 0 6px ${PRIO_COLOR[tarefa.prioridade]}`,
                  }}
                />
                {TAREFA_PRIORIDADE_LABELS[tarefa.prioridade]}
              </button>

              {tarefa.prazo ? (
                <>
                  <span aria-hidden>·</span>
                  <span title={`Prazo: ${formatBR(tarefa.prazo)}`}>
                    {formatBR(tarefa.prazo, "d MMM, HH:mm").replace(".", "")}
                  </span>
                </>
              ) : null}

              {categoriaNome ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{categoriaNome}</span>
                </>
              ) : null}
            </div>

            {/* Linha 3: controles — só aparecem no hover (ou foco). Revelam
                numa linha com divisória; toda a lógica é a mesma de antes. */}
            <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-32 group-hover:opacity-100 group-focus-within:max-h-32 group-focus-within:opacity-100">
              <div
                className="flex items-center gap-3 flex-wrap"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  marginTop: "13px",
                  paddingTop: "13px",
                }}
              >
                {/* Stand-by */}
                <button
                  type="button"
                  onClick={handleToggleStandBy}
                  disabled={pending}
                  aria-label={
                    tarefa.stand_by ? "Sair do stand by" : "Marcar como stand by"
                  }
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] leading-none transition-colors",
                    tarefa.stand_by
                      ? "text-amber-500"
                      : "text-muted-foreground/70 hover:text-muted-foreground",
                    pending && "opacity-50",
                  )}
                >
                  <PauseCircle className="h-3 w-3" />
                  {tarefa.stand_by ? "Stand by ativo" : "Stand by"}
                </button>

                {/* Editar prazo */}
                {!prazoEditing ? (
                  <button
                    type="button"
                    onClick={() => setPrazoEditing(true)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                  >
                    <CalendarClock className="h-3 w-3" />
                    {tarefa.prazo ? "Editar prazo" : "+ Definir prazo"}
                  </button>
                ) : null}

                {/* Categoria */}
                {categorias.length > 0 ? (
                  <select
                    value={tarefa.categoria_id ?? ""}
                    onChange={(e) => handleSetCategoria(e.target.value || null)}
                    disabled={pending}
                    aria-label="Categoria da tarefa"
                    className="h-5 rounded border border-input bg-transparent px-1 text-[10px] leading-none text-muted-foreground/80 hover:text-foreground transition-colors max-w-[140px]"
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
                  className="inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Subtarefa
                </button>

                {/* Observações */}
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
                  className="inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  {obsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {hasObs ? (
                    <span>
                      <FileText className="inline h-2.5 w-2.5 -mt-px mr-0.5" />
                      Observações
                    </span>
                  ) : (
                    <span>+ Observação</span>
                  )}
                </button>

                {/* Editar texto + Excluir (ícones à direita) */}
                <div className="ml-auto flex items-center gap-0.5">
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
              </div>
            </div>

            {/* Editor de prazo inline — fica visível independente do hover */}
            {prazoEditing ? (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
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
        )}
      </div>

      {/* Subtarefas (aninhadas) — só no modo completo */}
      {!compact && !editing && (subtarefas.length > 0 || subAdding) ? (
        <div className="relative mt-2 ml-6 border-l border-primary/20 pl-2.5">
          {/* Anim 3: bloco colapsável (max-height + opacity, ~300ms). */}
          <div
            ref={subListRef}
            style={{
              maxHeight: subMaxH,
              opacity: subtasksOpen ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 300ms ease, opacity 300ms ease",
            }}
          >
            <div className="space-y-0.5">
              {subtarefas.map((sub) => (
                <SubtarefaRow key={sub.id} sub={sub} />
              ))}
            </div>
          </div>
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
        <div className="relative mt-2 ml-6 rounded-md border border-border/60 bg-card/40 p-2.5 space-y-1.5">
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

/**
 * Rótulo de atraso pro chip da direita (ex: "3 dias atrás", "1 dia atrás").
 * Só visual; a proximidade real do prazo vem de deadlineProximity
 * (lib/tarefas/prazo). Mesma conta de dias de antes, só o texto mudou.
 */
function overdueDaysLabel(prazoIso: string): string {
  const ms = Date.now() - new Date(prazoIso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} ${days === 1 ? "dia" : "dias"} atrás`;
  const hrs = Math.max(Math.floor(ms / 3_600_000), 1);
  return `${hrs} ${hrs === 1 ? "hora" : "horas"} atrás`;
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
          "flex-1 min-w-0 leading-snug",
          sub.concluida && "line-through text-muted-foreground",
        )}
        style={{
          fontSize: "13.5px",
          color: sub.concluida ? undefined : "rgba(255,255,255,0.78)",
        }}
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
