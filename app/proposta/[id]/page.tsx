import { notFound } from "next/navigation";
import { getPropostaById } from "@/lib/propostas/queries";
import { formatBRL } from "@/lib/format";
import { PrintButton } from "@/components/propostas/print-button";

export const dynamic = "force-dynamic";

// Documento da proposta pro cliente — identidade dark da marca HALO (fundo
// preto, azul #0071E3). Fora do layout do app. Fonte de verdade dos valores:
// colunas geradas valor_total (bruto) e valor_liquido (líquido). Nada é
// recalculado aqui.
//
// IMPORTANTE: obs_interna JAMAIS aparece neste documento — só obs_pdf é exibido
// pro cliente. O `vertical` é controle interno e também NÃO é renderizado aqui.

const BLUE = "#0071E3";
const WHITE = "#fff";
const W85 = "rgba(255,255,255,0.85)";
const W60 = "rgba(255,255,255,0.6)";
const W45 = "rgba(255,255,255,0.45)";
const W35 = "rgba(255,255,255,0.35)";
const W10 = "rgba(255,255,255,0.1)";
const W08 = "rgba(255,255,255,0.08)";
const W05 = "rgba(255,255,255,0.05)";
const HEADING_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const CSS = `
  @page { size: A4; margin: 16mm; }
  html, body { background: #000; }
  @media print {
    .no-print { display: none !important; }
    html, body, .proposta-doc { background: #000 !important; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  .proposta-doc {
    background: #000;
    color: ${WHITE};
    font-family: 'Open Sans', ui-sans-serif, system-ui, sans-serif;
    font-weight: 300;
    max-width: 720px;
    min-height: 100vh;
    margin: 0 auto;
    padding: 56px 48px 44px;
  }
  .proposta-doc .heading {
    font-family: ${HEADING_FONT};
    font-weight: 700;
  }
  .proposta-doc .sec-label {
    font-family: 'Open Sans', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${W45};
    margin: 0 0 14px;
  }
  .proposta-doc .divider {
    height: 1px;
    border: 0;
    background: linear-gradient(90deg, ${BLUE}, transparent);
    margin: 36px 0;
  }
  .proposta-doc .num { font-variant-numeric: tabular-nums; }
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
  const descontoPct = proposta.desconto_percentual.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <PrintButton />

      <div className="proposta-doc">
        {/* Cabeçalho */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <svg
            viewBox="0 0 180 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ height: "26px", width: "auto" }}
          >
            <circle
              cx="14"
              cy="19"
              r="11"
              stroke="white"
              strokeWidth="4.5"
              fill="none"
            />
            <circle
              cx="40"
              cy="19"
              r="11"
              stroke="white"
              strokeWidth="4.5"
              fill="none"
            />
            <line
              x1="47"
              y1="27"
              x2="54"
              y2="36"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <text
              x="64"
              y="27"
              fontFamily="Helvetica Neue,Helvetica,Arial,sans-serif"
              fontWeight="300"
              fontSize="20"
              letterSpacing="4"
              fill="white"
            >
              HALO
            </text>
          </svg>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: BLUE,
              }}
            >
              Proposta Comercial
            </div>
            <div
              className="num"
              style={{ fontSize: "13px", color: W45, marginTop: "5px" }}
            >
              {formatDataDots(proposta.data_envio)}
            </div>
          </div>
        </header>

        <hr className="divider" />

        {/* PARA — só o nome do cliente (vertical é interno, não vai no PDF) */}
        <section>
          <p className="sec-label">Para</p>
          <div
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontSize: "24px",
              fontWeight: 400,
              color: WHITE,
            }}
          >
            {proposta.cliente}
          </div>
        </section>

        <hr className="divider" />

        {/* INVESTIMENTO TOTAL */}
        <section>
          <p className="sec-label">Investimento total</p>
          <div
            className="heading num"
            style={{ fontSize: "44px", color: WHITE, lineHeight: 1.05 }}
          >
            {formatBRL(liquido)}
          </div>
          <div style={{ fontSize: "13px", color: W60, marginTop: "8px" }}>
            {proposta.quantidade}{" "}
            {proposta.quantidade === 1 ? "anel HALO" : "anéis HALO"} ·{" "}
            <span className="num">{formatBRL(porAnel)}</span> por anel
          </div>

          {proposta.condicao_especial ? (
            <div
              style={{
                display: "inline-block",
                marginTop: "16px",
                padding: "5px 12px",
                borderRadius: "999px",
                border: `1px solid rgba(0,113,227,0.5)`,
                background: "rgba(0,113,227,0.1)",
                color: BLUE,
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Condição Especial
            </div>
          ) : null}
        </section>

        <hr className="divider" />

        {/* DETALHAMENTO */}
        <section>
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
                label={`Desconto (${descontoPct}%)`}
                value={`− ${formatBRL(descontoValor)}`}
                valueColor={BLUE}
              />
              <tr>
                <td
                  className="heading"
                  style={{
                    padding: "16px 0 0",
                    borderTop: `1px solid rgba(255,255,255,0.15)`,
                    color: BLUE,
                    fontSize: "18px",
                  }}
                >
                  Total líquido
                </td>
                <td
                  className="heading num"
                  style={{
                    padding: "16px 0 0",
                    borderTop: `1px solid rgba(255,255,255,0.15)`,
                    textAlign: "right",
                    color: BLUE,
                    fontSize: "18px",
                  }}
                >
                  {formatBRL(liquido)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <hr className="divider" />

        {/* FORMAS DE PAGAMENTO — grid 2×2 */}
        <section>
          <p className="sec-label">Formas de pagamento</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <PaymentBox titulo="Pix" desc="Aprovação instantânea." />
            <PaymentBox titulo="Boleto" desc="Aprovado em 1 ou 2 dias úteis." />
            <PaymentBox titulo="Cartão de crédito" desc="Aprovação imediata." />
            <PaymentBox
              titulo="4× sem juros"
              desc="No cartão."
              destaque
              valorAzul={`4× de ${formatBRL(parcela4)}`}
            />
          </div>
        </section>

        {/* OBSERVAÇÕES (somente obs_pdf — pro cliente) */}
        {proposta.obs_pdf && proposta.obs_pdf.trim() ? (
          <>
            <hr className="divider" />
            <section>
              <p className="sec-label">Observações</p>
              <p
                style={{
                  fontSize: "13px",
                  color: W85,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {proposta.obs_pdf}
              </p>
            </section>
          </>
        ) : null}

        {/* RODAPÉ */}
        <footer
          style={{
            marginTop: "48px",
            paddingTop: "20px",
            borderTop: `1px solid ${W08}`,
            fontSize: "11px",
            color: W35,
            lineHeight: 1.9,
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
      <td
        style={{
          padding: "11px 0",
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {label}
      </td>
      <td
        className="num"
        style={{
          padding: "11px 0",
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          textAlign: "right",
          color: valueColor ?? "rgba(255,255,255,0.85)",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function PaymentBox({
  titulo,
  desc,
  destaque,
  valorAzul,
}: {
  titulo: string;
  desc: string;
  destaque?: boolean;
  valorAzul?: string;
}) {
  return (
    <div
      style={{
        background: destaque ? "rgba(0,113,227,0.1)" : W05,
        border: `1px solid ${destaque ? "rgba(0,113,227,0.5)" : W10}`,
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "'Open Sans', sans-serif",
          fontWeight: 400,
          fontSize: "14px",
          color: WHITE,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontFamily: "'Open Sans', sans-serif",
          fontWeight: 300,
          fontSize: "12px",
          color: W45,
          marginTop: "4px",
        }}
      >
        {desc}
      </div>
      {valorAzul ? (
        <div
          className="num"
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 600,
            fontSize: "13px",
            color: BLUE,
            marginTop: "8px",
          }}
        >
          {valorAzul}
        </div>
      ) : null}
    </div>
  );
}
