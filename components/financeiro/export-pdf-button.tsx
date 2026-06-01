"use client";

import { FileDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Botão "Exportar PDF" no header de /financeiro.
 * Abre a rota /financeiro/dre/print em nova aba carregando os mesmos
 * filtros atuais. A página de print dispara window.print() automaticamente
 * pra abrir o diálogo do navegador, onde o user pode "Salvar como PDF".
 */
export function ExportPdfButton() {
  const params = useSearchParams();

  function handleClick() {
    const qs = params.toString();
    const url = qs ? `/financeiro/dre/print?${qs}` : "/financeiro/dre/print";
    window.open(url, "_blank");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <FileDown className="h-3.5 w-3.5" />
      Exportar PDF
    </Button>
  );
}
