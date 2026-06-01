"use client";

import { useEffect } from "react";

/**
 * Dispara o print dialog automaticamente quando a página termina de
 * carregar. Pequeno delay (300ms) pra fontes/imagens renderizarem.
 *
 * Não interfere com a UI — renderiza null. Re-print manual continua
 * disponível pelo Cmd/Ctrl+P do browser ou pelo botão "Imprimir" da
 * página.
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
