import { notFound } from "next/navigation";
import { getPropostaById } from "@/lib/propostas/queries";
import { PROPOSTA_VERTICAL_LABELS } from "@/lib/database.types";
import { formatBRL } from "@/lib/format";
import { PrintButton } from "@/components/propostas/print-button";

export const dynamic = "force-dynamic";

// Documento da proposta pro cliente — pele CLARA (fundo branco), fora do layout
// do app. Fonte de verdade dos valores: colunas geradas valor_total (bruto) e
// valor_liquido (líquido). Nada é recalculado aqui.
//
// IMPORTANTE: obs_interna JAMAIS aparece neste documento — só obs_pdf é exibido
// pro cliente.

const ACCENT = "#1a56db";
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const CSS = `
  @page { size: A4; margin: 16mm; }
  @media print {
    .no-print { display: none !important; }
    html, body { background: #ffffff !important; }
    .proposta-doc { box-shadow: none !important; margin: 0 !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .proposta-doc {
    background: #ffffff;
    color: ${INK};
    font-family: "Open Sans", ui-sans-serif, system-ui, sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 56px 48px 40px;
  }
  .proposta-doc .mono {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }
  .proposta-doc .sec-label {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${MUTED};
    margin: 0 0 10px;
  }
`;

function formatDataDots(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export default async function PropostaDocumentoPage({
  params,
}: {
  params: { id: string };
}) {
  const proposta = await getPropostaById(params.id);
  if (!proposta) notFound();

  const bruto = proposta.valor_total; // gerada = qtd × valor_unitario
  const liquido = proposta.valor_liquido; // gerada = bruto líquido do desconto
  const descontoValor = bruto - liquido;
  const porAnel = proposta.quantidade > 0 ? liquido / proposta.quantidade : 0;
  const parcela4 = liquido / 4;

  const verticalLabel = proposta.vertical
    ? PROPOSTA_VERTICAL_LABELS[proposta.vertical]
    : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <PrintButton />

      <div className="proposta-doc">
        {/* Cabeçalho */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: `2px solid ${INK}`,
            paddingBottom: "18px",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "0.28em",
              color: INK,
            }}
          >
            HALO
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: ACCENT,
                fontWeight: 600,
              }}
            >
              Proposta Comercial
            </div>
            <div
              className="mono"
              style={{ fontSize: "13px", color: MUTED, marginTop: "4px" }}
            >
              {formatDataDots(proposta.data_envio)}
            </div>
          </div>
        </header>

        {/* PARA */}
        <section style={{ marginTop: "36px" }}>
          <p className="sec-label">Para</p>
          <div style={{ fontSize: "24px", fontWeight: 600, color: INK }}>
            {proposta.cliente}
          </div>
          {verticalLabel ? (
            <div style={{ fontSize: "13px", color: MUTED, marginTop: "2px" }}>
              {verticalLabel}
            </div>
          ) : null}
        </section>

        {/* INVESTIMENTO TOTAL */}
        <section style={{ marginTop: "36px" }}>
          <p className="sec-label">Investimento total</p>
          <div
            className="mono"
            style={{ fontSize: "40px", fontWeight: 700, color: ACCENT, lineHeight: 1.1 }}
          >
            {formatBRL(liquido)}
          </div>
          <div style={{ fontSize: "13px", color: MUTED, marginTop: "6px" }}>
            {proposta.quantidade}{" "}
            {proposta.quantidade === 1 ? "anel HALO" : "anéis HALO"} ·{" "}
            <span className="mono">{formatBRL(porAnel)}</span> por anel
          </div>

          {proposta.condicao_especial ? (
            <div
              style={{
                display: "inline-block",
                marginTop: "14px",
                padding: "5px 12px",
                borderRadius: "999px",
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Condição Especial
            </div>
          ) : null}
        </section>

        {/* DETALHAMENTO */}
        <section style={{ marginTop: "40px" }}>
          <p className="sec-label">Detalhamento</p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <tbody>
              <DetailRow
                label="Preço de tabela"
                value={`${formatBRL(proposta.valor_unitario)} / un.`}
              />
              <DetailRow
                label="Quantidade"
                value={`${proposta.quantidade} ${proposta.quantidade === 1 ? "unidade" : "unidades"}`}
              />
              <DetailRow label="Valor bruto" value={formatBRL(bruto)} />
              <DetailRow
                label={`Desconto (${proposta.desconto_percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)`}
                value={`− ${formatBRL(descontoValor)}`}
                valueColor={ACCENT}
              />
              <tr>
                <td
                  style={{
                    padding: "14px 0 0",
                    borderTop: `2px solid ${INK}`,
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  Total líquido
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "14px 0 0",
                    borderTop: `2px solid ${INK}`,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: ACCENT,
                  }}
                >
                  {formatBRL(liquido)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* FORMAS DE PAGAMENTO */}
        <section style={{ marginTop: "40px" }}>
          <p className="sec-label">Formas de pagamento</p>
          <div style={{ display: "grid", gap: "10px", fontSize: "13px" }}>
            <PaymentRow titulo="Pix" detalhe="Aprovação instantânea." />
            <PaymentRow titulo="Boleto" detalhe="Aprovado em 1 ou 2 dias úteis." />
            <PaymentRow
              titulo="Cartão de crédito"
              detalhe="Aprovação imediata."
            />
            <PaymentRow
              titulo="4× sem juros"
              detalhe={
                <>
                  No cartão. 4× de{" "}
                  <span className="mono">{formatBRL(parcela4)}</span>.
                </>
              }
            />
          </div>
        </section>

        {/* OBSERVAÇÕES (somente obs_pdf — pro cliente) */}
        {proposta.obs_pdf && proposta.obs_pdf.trim() ? (
          <section style={{ marginTop: "40px" }}>
            <p className="sec-label">Observações</p>
            <p
              style={{
                fontSize: "13px",
                color: INK,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {proposta.obs_pdf}
            </p>
          </section>
        ) : null}

        {/* VALIDADE */}
        <p
          style={{
            marginTop: "40px",
            fontSize: "12px",
            color: MUTED,
            fontStyle: "italic",
          }}
        >
          Proposta válida por 15 dias.
        </p>

        {/* RODAPÉ */}
        <footer
          style={{
            marginTop: "32px",
            paddingTop: "18px",
            borderTop: `1px solid ${LINE}`,
            fontSize: "11px",
            color: MUTED,
            lineHeight: 1.8,
          }}
        >
          <div>
            corporativo@halodevice.com.br · +55 (61) 99622-9787 · haloqring.com ·
            @halodevice
          </div>
          <div>HALOQRING LTDA · CNPJ 61.525.025/0001-01</div>
        </footer>
      </div>
    </>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <tr>
      <td style={{ padding: "9px 0", borderBottom: `1px solid ${LINE}`, color: INK }}>
        {label}
      </td>
      <td
        className="mono"
        style={{
          padding: "9px 0",
          borderBottom: `1px solid ${LINE}`,
          textAlign: "right",
          color: valueColor ?? INK,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function PaymentRow({
  titulo,
  detalhe,
}: {
  titulo: string;
  detalhe: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "16px",
        borderBottom: `1px solid ${LINE}`,
        paddingBottom: "9px",
      }}
    >
      <span style={{ fontWeight: 600, color: INK }}>{titulo}</span>
      <span style={{ color: MUTED, textAlign: "right" }}>{detalhe}</span>
    </div>
  );
}
