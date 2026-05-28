import { Fragment } from "react";

const VAR_RE = /\{([a-z0-9_]+)\}/gi;

/**
 * Variáveis padrão sugeridas no form (apenas referência — qualquer token
 * `{nome}` é detectado automaticamente).
 */
export const DEFAULT_TEMPLATE_VARS = [
  "nome_cliente",
  "empresa",
  "quantidade",
  "valor",
] as const;

/**
 * Renderiza o corpo do template segmentando em texto vs `{variável}`.
 * As variáveis ganham cor primary + borda azul translúcida.
 *
 * Preserva quebras de linha do original.
 */
export function HighlightedBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments: { type: "text" | "var"; value: string; key: number }[] = [];
  let lastIndex = 0;
  let key = 0;

  // Reset regex state porque é global
  VAR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VAR_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
        key: key++,
      });
    }
    segments.push({ type: "var", value: match[0], key: key++ });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex), key: key++ });
  }

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segments.map((s) =>
        s.type === "var" ? (
          <span
            key={s.key}
            className="inline-flex items-center rounded-sm bg-primary/15 text-primary border border-primary/30 px-1 py-0 text-[10px] font-mono align-baseline"
          >
            {s.value}
          </span>
        ) : (
          <Fragment key={s.key}>{s.value}</Fragment>
        ),
      )}
    </span>
  );
}

/**
 * Extrai as variáveis únicas presentes no texto (ex: ["nome_cliente", "empresa"]).
 */
export function extractVars(text: string): string[] {
  const set = new Set<string>();
  VAR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VAR_RE.exec(text)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}
