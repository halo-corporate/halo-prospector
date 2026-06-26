"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INTERACAO_CANAL_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  type InteracaoCanal,
  type Lead,
  type LeadStatus,
} from "@/lib/database.types";
import { CHIP_FORM, statusBadgeClass, temperaturaBadgeClass } from "@/lib/leads/badge";
import { formatBR, formatBRHuman, isOverdueBR } from "@/lib/timezone";
import { updateLeadStatusAction } from "@/lib/leads/actions";

interface LastInteracao {
  canal: string;
  data_hora: string;
}

interface Props {
  leads: Lead[];
  d1Map: Record<string, string>;
  lastInteracaoMap: Record<string, LastInteracao>;
}

/**
 * Ordem das colunas do board CRM. Reflete o pipeline ideal de prospecção:
 * descoberta → contato → qualificação → fechamento. "Perdido" e "Descartado"
 * ficam no fim como colunas de arquivo (visualmente diminuídas).
 */
const BOARD_COLUMNS: LeadStatus[] = [
  "novo",
  "pesquisando",
  "tentativa_contato",
  "em_qualificacao",
  "aquecido",
  "passado_closer",
  "ganho",
  "perdido",
  "descartado",
];

const STATUS_OPTIONS = BOARD_COLUMNS;

export function LeadsBoard({ leads, d1Map, lastInteracaoMap }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Agrupa leads por status mantendo a ordem original (já vem ordenada do server).
  const byStatus = new Map<LeadStatus, Lead[]>();
  for (const s of BOARD_COLUMNS) byStatus.set(s, []);
  for (const l of leads) {
    const arr = byStatus.get(l.status);
    if (arr) arr.push(l);
  }

  function handleStatusChange(leadId: string, nextStatus: LeadStatus) {
    setPendingId(leadId);
    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, nextStatus);
      setPendingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        // Falha rara — server action retorna mensagem; mostra inline.
        alert(`Falha ao mover lead: ${res.message}`);
      }
    });
  }

  if (leads.length === 0) {
    return (
      <div className="halo-glass rounded-halo p-12 text-center text-sm text-muted-foreground">
        Nenhum lead encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto pb-2 -mx-2 px-2"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        transform: "translateZ(0)",
      }}
    >
      <div className="flex gap-3 min-w-max">
        {BOARD_COLUMNS.map((status) => {
          const columnLeads = byStatus.get(status) ?? [];
          const isArchive = status === "perdido" || status === "descartado";
          return (
            <div
              key={status}
              className={cn(
                "w-[280px] shrink-0 rounded-halo border border-white/10 bg-white/[0.03] flex flex-col",
                isArchive && "opacity-70",
              )}
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn("border", CHIP_FORM, statusBadgeClass(status))}
                  >
                    {LEAD_STATUS_LABELS[status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 min-h-[80px]">
                {columnLeads.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4 italic">
                    Vazio
                  </p>
                ) : (
                  columnLeads.map((lead) => {
                    const d1 = d1Map[lead.id];
                    const last = lastInteracaoMap[lead.id];
                    const overdue =
                      lead.proximo_followup &&
                      isOverdueBR(lead.proximo_followup);
                    const isLeadPending =
                      isPending && pendingId === lead.id;
                    return (
                      <div
                        key={lead.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/crm/${lead.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/crm/${lead.id}`);
                          }
                        }}
                        className={cn(
                          "group rounded-md border border-white/10 bg-white/[0.04] p-2.5 cursor-pointer transition-colors hover:bg-white/[0.08] hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50",
                          isLeadPending && "opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1 text-white">
                            {lead.empresa}
                          </p>
                          {lead.temperatura ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                temperaturaBadgeClass(lead.temperatura),
                                CHIP_FORM,
                                "shrink-0",
                              )}
                            >
                              {LEAD_TEMPERATURA_LABELS[lead.temperatura]}
                            </Badge>
                          ) : null}
                        </div>

                        {d1 ? (
                          <p className="text-[11px] text-muted-foreground truncate mt-1">
                            {d1}
                          </p>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                          {last ? (
                            <span
                              className="text-muted-foreground truncate"
                              title={formatBR(last.data_hora)}
                            >
                              {INTERACAO_CANAL_LABELS[
                                last.canal as InteracaoCanal
                              ] ?? last.canal}{" "}
                              · {formatBRHuman(last.data_hora)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Sem interação
                            </span>
                          )}
                          {lead.proximo_followup ? (
                            <span
                              className={cn(
                                "whitespace-nowrap shrink-0",
                                overdue
                                  ? "text-red-400 font-medium"
                                  : "text-muted-foreground",
                              )}
                              title={formatBR(lead.proximo_followup)}
                            >
                              {formatBR(lead.proximo_followup, "dd/MM")}
                            </span>
                          ) : null}
                        </div>

                        {/* Mover de coluna (status) — native select pra UX nativa mobile */}
                        <div
                          className="mt-2 pt-2 border-t border-white/5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={lead.status}
                            disabled={isLeadPending}
                            onChange={(e) =>
                              handleStatusChange(
                                lead.id,
                                e.target.value as LeadStatus,
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Mover lead para outro status"
                            className="w-full text-[10px] bg-transparent text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground cursor-pointer disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option
                                key={s}
                                value={s}
                                className="bg-background text-foreground"
                              >
                                Mover → {LEAD_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
