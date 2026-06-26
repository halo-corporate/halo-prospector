"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerticalSelect } from "@/components/leads/vertical-select";
import {
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURA_LABELS,
  readLeadVerticais,
  type Lead,
  type LeadStatus,
  type LeadTemperatura,
} from "@/lib/database.types";
import { toDateTimeLocalBR } from "@/lib/timezone";
import {
  createLeadAction,
  updateLeadAction,
  type LeadActionState,
} from "@/lib/leads/actions";

const initialState: LeadActionState = { status: "idle" };
const NONE = "_none_";

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const label = mode === "create" ? "Criar lead" : "Salvar alterações";
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : label}
    </Button>
  );
}

interface Props {
  mode: "create" | "edit";
  lead?: Lead;
  verticais: { slug: string; label: string }[];
}

export function LeadForm({ mode, lead, verticais }: Props) {
  const action = mode === "create" ? createLeadAction : updateLeadAction;
  const [state, formAction] = useFormState(action, initialState);

  const initialVerticais = lead
    ? readLeadVerticais(lead)
    : verticais[0]
      ? [verticais[0].slug]
      : [];
  const [verticaisSelecionadas, setVerticaisSelecionadas] = useState<string[]>(
    initialVerticais,
  );
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? "novo");
  const [temperatura, setTemperatura] = useState<LeadTemperatura | "">(
    lead?.temperatura ?? "",
  );
  const requiresMotivo = status === "perdido" || status === "descartado";

  useEffect(() => {
    if (state.status === "error") {
      toast.error(state.message);
    } else if (state.status === "success" && mode === "edit") {
      toast.success("Alterações salvas");
    }
  }, [state, mode]);

  return (
    <form
      action={formAction}
      className="space-y-6"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        transform: "translateZ(0)",
      }}
    >
      {mode === "edit" && lead ? (
        <input type="hidden" name="id" value={lead.id} />
      ) : null}

      <Section title="Empresa">
        <Field label="Empresa" name="empresa" required defaultValue={lead?.empresa} />

        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            Verticais<span className="text-destructive"> *</span>
          </Label>
          <VerticalSelect
            verticais={verticais}
            value={verticaisSelecionadas}
            onChange={setVerticaisSelecionadas}
          />
          <input
            type="hidden"
            name="verticais"
            value={verticaisSelecionadas.join(",")}
          />
          <p className="text-xs text-muted-foreground">
            Selecione 1 ou mais. A primeira vira a vertical principal.
          </p>
        </div>

        <Field
          label="Sub-nicho"
          name="sub_nicho"
          defaultValue={lead?.sub_nicho ?? ""}
          placeholder="ex: medicina integrativa"
        />
        <div className="grid grid-cols-3 gap-3 col-span-full">
          <Field
            label="Cidade"
            name="cidade"
            defaultValue={lead?.cidade ?? ""}
          />
          <Field
            label="UF"
            name="estado"
            maxLength={2}
            inputClassName="uppercase"
            defaultValue={lead?.estado ?? ""}
          />
          <Field
            label="Bairro / Região"
            name="bairro_regiao"
            defaultValue={lead?.bairro_regiao ?? ""}
          />
        </div>
      </Section>

      <Section title="Contato">
        <Field
          label="Telefone"
          name="telefone"
          defaultValue={lead?.telefone ?? ""}
        />
        <Field
          label="Celular"
          name="celular"
          defaultValue={lead?.celular ?? ""}
        />
        <MultiInput
          label="E-mail"
          name="emails"
          initial={lead?.emails ?? []}
          placeholder="contato@empresa.com"
        />
        <MultiInput
          label="Instagram"
          name="instagrams"
          initial={lead?.instagrams ?? []}
          placeholder="@handle"
        />
        <MultiInput
          label="Site"
          name="sites"
          initial={lead?.sites ?? []}
          placeholder="https://…"
        />
      </Section>

      <Section title="Comercial">
        <Field
          label="Ticket estimado (unidades)"
          name="ticket_estimado"
          type="number"
          min={0}
          defaultValue={lead?.ticket_estimado ?? ""}
        />

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as LeadStatus)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="status" value={status} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="temperatura">Temperatura</Label>
          <Select
            value={temperatura === "" ? NONE : temperatura}
            onValueChange={(v) =>
              setTemperatura(v === NONE ? "" : (v as LeadTemperatura))
            }
          >
            <SelectTrigger id="temperatura">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {(Object.keys(LEAD_TEMPERATURA_LABELS) as LeadTemperatura[]).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {LEAD_TEMPERATURA_LABELS[t]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <input type="hidden" name="temperatura" value={temperatura} />
        </div>

        <Field
          label="Próximo passo"
          name="proximo_passo"
          defaultValue={lead?.proximo_passo ?? ""}
          placeholder="ex: ligar terça à tarde"
        />

        <div className="space-y-1.5">
          <Label htmlFor="proximo_followup">Próximo follow-up (BR)</Label>
          <Input
            id="proximo_followup"
            name="proximo_followup"
            type="datetime-local"
            defaultValue={
              lead?.proximo_followup
                ? toDateTimeLocalBR(lead.proximo_followup)
                : ""
            }
          />
        </div>
      </Section>

      {requiresMotivo ? (
        <Section title="Encerramento">
          <Field
            label="Motivo (perdido/descartado)"
            name="motivo_perda"
            required
            defaultValue={lead?.motivo_perda ?? ""}
            className="col-span-full"
          />
        </Section>
      ) : (
        <input
          type="hidden"
          name="motivo_perda"
          value={lead?.motivo_perda ?? ""}
        />
      )}

      <Section title="Observações">
        <div className="col-span-full space-y-1.5">
          <Label htmlFor="observacoes">Anotações livres</Label>
          <Textarea
            id="observacoes"
            name="observacoes"
            rows={5}
            defaultValue={lead?.observacoes ?? ""}
            placeholder="Contexto, dores, links úteis, etc."
          />
        </div>
      </Section>

      <div className="flex items-center gap-2 justify-end pt-2 border-t border-border">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

/**
 * Repeater de inputs de texto livre pra contato multi-valor (emails, instagrams,
 * sites). Espelha o padrão do VerticalSelect: estado local + um hidden input que
 * serializa pra CSV (vazios filtrados), pra o FormData mandar igual `verticais`.
 * Os inputs visíveis NÃO têm `name` — só o hidden carrega o valor.
 */
function MultiInput({
  label,
  name,
  initial,
  placeholder,
}: {
  label: string;
  name: string;
  initial: string[];
  placeholder?: string;
}) {
  // Começa com 1 box vazia quando o lead não tem nenhum valor ainda.
  const [values, setValues] = useState<string[]>(
    initial.length > 0 ? initial : [""],
  );

  function update(i: number, v: string) {
    setValues((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }
  function add() {
    setValues((prev) => [...prev, ""]);
  }
  function remove(i: number) {
    setValues((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Filtra vazios antes de serializar — boxes em branco não viram contato.
  const serialized = values
    .map((v) => v.trim())
    .filter(Boolean)
    .join(",");

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
            />
            {values.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remover ${label}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" />
        adicionar {label.toLowerCase()}
      </button>
      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  maxLength,
  min,
  className,
  inputClassName,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  className?: string;
  inputClassName?: string;
}) {
  const dv =
    defaultValue === null || defaultValue === undefined ? "" : String(defaultValue);
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={dv}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        className={inputClassName}
      />
    </div>
  );
}
