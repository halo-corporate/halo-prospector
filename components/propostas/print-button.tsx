"use client";

/**
 * Botão de impressão do documento da proposta. Dispara window.print() pro
 * fluxo "Salvar como PDF" do navegador. Marcado .no-print pra sumir na versão
 * impressa (ver CSS @media print da página do documento).
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 50,
        padding: "10px 18px",
        borderRadius: "8px",
        border: "none",
        background: "#1a56db",
        color: "#fff",
        font: "600 13px/1 ui-sans-serif, system-ui, sans-serif",
        letterSpacing: "0.02em",
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(26,86,219,0.35)",
      }}
    >
      Gerar PDF / Imprimir
    </button>
  );
}
