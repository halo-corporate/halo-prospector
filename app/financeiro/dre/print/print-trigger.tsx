"use client";

import { useEffect } from "react";

/**
 * Dispara o print dialog automaticamente quando a página termina de
 * carregar. Pequeno delay (300ms) pra fontes/imagens renderizarem.
 *
 * Re-print manual via Cmd/Ctrl+P ou pelo botão renderizado abaixo.
 */
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* ignore — user pode disparar manualmente */
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/**
 * Botão "Imprimir / Salvar como PDF" — client component porque tem
 * onClick handler (não permitido em RSC). Escondido no @media print
 * via classe `print-hide` definida na page.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "6px 14px",
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "#fff",
        color: "#111",
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "inherit",
      }}
    >
      Imprimir / Salvar como PDF
    </button>
  );
}
