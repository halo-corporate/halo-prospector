import {
  getBreakdownByResponsavel,
  getBreakdownByStatus,
  getVendasAggregate,
  listVendas,
} from "@/lib/financeiro/queries";
import {
  currentMonthBR,
  formatBRL,
  formatDateBR,
  formatMonthLabel,
  formatPercent,
  pctChange,
  previousMonth,
} from "@/lib/financeiro/format";
import {
  VENDA_RESPONSAVEIS,
  VENDA_RESPONSAVEL_LABELS,
  VENDA_STATUS_LABELS,
  type VendaResponsavel,
  type VendaStatus,
} from "@/lib/database.types";
import { PrintButton, PrintTrigger } from "./print-trigger";

export const metadata = { title: "DRE — Exportação PDF" };
export const dynamic = "force-dynamic";

interface SearchParams {
  responsavel?: string;
  status?: string;
  mes?: string;
  q?: string;
}

function isOneOf<T extends string>(
  v: string | undefined,
  list: T[],
): T | undefined {
  return v && (list as string[]).includes(v) ? (v as T) : undefined;
}

export default async function PrintDREPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const mesParam = searchParams.mes ?? currentMonthBR();
  const mesFilter = mesParam === "_any_" ? undefined : mesParam;

  const filters = {
    responsavel: isOneOf<VendaResponsavel>(
      searchParams.responsavel,
      [...VENDA_RESPONSAVEIS],
    ),
    status: isOneOf<VendaStatus>(
      searchParams.status,
      ["pendente", "pago", "parcial", "cancelado"],
    ),
    mes: mesFilter,
    q: searchParams.q || undefined,
  };

  const prevMes = filters.mes ? previousMonth(filters.mes) : null;

  const [vendas, currentAgg, prevAgg, respBreakdown, statusBreakdown] =
    await Promise.all([
      listVendas(filters),
      getVendasAggregate(filters),
      prevMes
        ? getVendasAggregate({ ...filters, mes: prevMes })
        : Promise.resolve(null),
      getBreakdownByResponsavel(filters),
      getBreakdownByStatus(filters),
    ]);

  const isCurrentMonth = filters.mes === currentMonthBR();
  const moMBruto =
    prevAgg && filters.mes
      ? pctChange(currentAgg.bruto, prevAgg.bruto)
      : null;

  const respMap = new Map(respBreakdown.map((r) => [r.responsavel, r]));
  const respFull = VENDA_RESPONSAVEIS.map(
    (r) =>
      respMap.get(r) ?? {
        responsavel: r,
        liquido: 0,
        comissao: 0,
        quantidade: 0,
      },
  ).sort((a, b) => b.liquido - a.liquido);

  const periodLabel = filters.mes
    ? formatMonthLabel(filters.mes)
    : "Todos os períodos";

  // Filtros aplicados pra subtitle
  const filtrosAplicados: string[] = [];
  if (filters.responsavel)
    filtrosAplicados.push(
      `Responsável: ${VENDA_RESPONSAVEL_LABELS[filters.responsavel]}`,
    );
  if (filters.status)
    filtrosAplicados.push(`Status: ${VENDA_STATUS_LABELS[filters.status]}`);
  if (filters.q) filtrosAplicados.push(`Busca: "${filters.q}"`);

  const geradoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <PrintTrigger />

      {/* CSS print: white bg, black text, hide controls em @print */}
      <style>{`
        @page { size: A4 portrait; margin: 14mm 12mm; }
        html, body { background: #fff !important; color: #111 !important; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
        .print-hide { display: inline-flex; }
        @media print {
          .print-hide { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          a { text-decoration: none; color: inherit; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <main
        className="bg-white text-black mx-auto"
        style={{
          maxWidth: "210mm",
          padding: "12mm",
          color: "#111",
          background: "#fff",
        }}
      >
        {/* Toolbar (não imprime) */}
        <div className="print-hide" style={{ marginBottom: "12px" }}>
          <PrintButton />
        </div>

        {/* Header */}
        <header
          style={{
            borderBottom: "2px solid #0071E3",
            paddingBottom: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#666",
                  margin: 0,
                }}
              >
                HALO Prospector — Relatório financeiro
              </p>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  margin: "4px 0 0",
                }}
              >
                DRE — {periodLabel}
              </h1>
              {filtrosAplicados.length > 0 ? (
                <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                  Filtros: {filtrosAplicados.join(" · ")}
                </p>
              ) : null}
            </div>
            <p style={{ fontSize: 10, color: "#666", margin: 0 }}>
              Gerado em {geradoEm}
            </p>
          </div>
        </header>

        {currentAgg.quantidade === 0 ? (
          <div
            style={{
              padding: 40,
              border: "1px dashed #ccc",
              borderRadius: 8,
              textAlign: "center",
              color: "#666",
            }}
          >
            Nenhuma venda encontrada para o período/filtros selecionados.
          </div>
        ) : (
          <>
            {/* Faturamento Bruto em destaque */}
            <section style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#666",
                  margin: 0,
                }}
              >
                Faturamento bruto
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                <p
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    margin: 0,
                  }}
                >
                  {formatBRL(currentAgg.bruto)}
                </p>
                {moMBruto !== null && prevAgg ? (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: moMBruto >= 0 ? "#e6f4ec" : "#fdecec",
                      color: moMBruto >= 0 ? "#1c6b3a" : "#9b1f23",
                    }}
                  >
                    {moMBruto >= 0 ? "▲" : "▼"}{" "}
                    {moMBruto > 0 ? "+" : ""}
                    {moMBruto.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}% vs {formatBRL(prevAgg.bruto)}
                    {isCurrentMonth ? " (parcial)" : ""}
                  </span>
                ) : null}
              </div>
            </section>

            {/* Sub-KPIs */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <KpiBox
                label="Líquido"
                value={formatBRL(currentAgg.liquido)}
                highlight
              />
              <KpiBox label="Comissões" value={formatBRL(currentAgg.comissao)} />
              <KpiBox label="Vendas" value={String(currentAgg.quantidade)} />
              <KpiBox
                label="Ticket médio"
                value={formatBRL(currentAgg.ticketMedio)}
              />
            </section>

            {/* Breakdowns lado a lado */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#666",
                    margin: "0 0 8px",
                    fontWeight: 600,
                  }}
                >
                  Por responsável
                </h2>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Responsável
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Qtd
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Líquido
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Comissão
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {respFull.map((r) => {
                      const pct =
                        currentAgg.liquido > 0
                          ? (r.liquido / currentAgg.liquido) * 100
                          : 0;
                      return (
                        <tr
                          key={r.responsavel}
                          style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                          <td style={{ padding: "4px 6px" }}>
                            {VENDA_RESPONSAVEL_LABELS[r.responsavel]}
                          </td>
                          <td
                            style={{ padding: "4px 6px", textAlign: "right" }}
                          >
                            {r.quantidade}
                          </td>
                          <td
                            style={{
                              padding: "4px 6px",
                              textAlign: "right",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {formatBRL(r.liquido)}
                          </td>
                          <td
                            style={{
                              padding: "4px 6px",
                              textAlign: "right",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {formatBRL(r.comissao)}
                          </td>
                          <td
                            style={{
                              padding: "4px 6px",
                              textAlign: "right",
                              color: "#666",
                            }}
                          >
                            {pct.toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#666",
                    margin: "0 0 8px",
                    fontWeight: 600,
                  }}
                >
                  Por status
                </h2>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Qtd
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "4px 6px",
                          fontWeight: 600,
                        }}
                      >
                        Líquido
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusBreakdown.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: "8px 6px",
                            textAlign: "center",
                            color: "#999",
                          }}
                        >
                          —
                        </td>
                      </tr>
                    ) : (
                      statusBreakdown.map((s) => (
                        <tr
                          key={s.status}
                          style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                          <td style={{ padding: "4px 6px" }}>
                            {VENDA_STATUS_LABELS[s.status]}
                          </td>
                          <td
                            style={{ padding: "4px 6px", textAlign: "right" }}
                          >
                            {s.quantidade}
                          </td>
                          <td
                            style={{
                              padding: "4px 6px",
                              textAlign: "right",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {formatBRL(s.liquido)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Tabela detalhada de vendas */}
            <section>
              <h2
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#666",
                  margin: "0 0 8px",
                  fontWeight: 600,
                }}
              >
                Detalhe das vendas ({vendas.length})
              </h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 10,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid #0071E3",
                      background: "#f7f9fc",
                    }}
                  >
                    <th style={{ textAlign: "left", padding: "5px 6px" }}>
                      Data
                    </th>
                    <th style={{ textAlign: "left", padding: "5px 6px" }}>
                      Cliente
                    </th>
                    <th style={{ textAlign: "right", padding: "5px 6px" }}>
                      Qtd
                    </th>
                    <th style={{ textAlign: "right", padding: "5px 6px" }}>
                      Unit.
                    </th>
                    <th style={{ textAlign: "right", padding: "5px 6px" }}>
                      Líquido
                    </th>
                    <th style={{ textAlign: "left", padding: "5px 6px" }}>
                      Resp.
                    </th>
                    <th style={{ textAlign: "right", padding: "5px 6px" }}>
                      Comissão
                    </th>
                    <th style={{ textAlign: "left", padding: "5px 6px" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map((v) => (
                    <tr
                      key={v.id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td
                        style={{
                          padding: "4px 6px",
                          whiteSpace: "nowrap",
                          color: "#444",
                        }}
                      >
                        {formatDateBR(v.data_venda)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>{v.cliente}</td>
                      <td
                        style={{ padding: "4px 6px", textAlign: "right" }}
                      >
                        {v.quantidade}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                        }}
                      >
                        {formatBRL(v.valor_unitario)}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 600,
                        }}
                      >
                        {formatBRL(v.valor_liquido)}
                      </td>
                      <td style={{ padding: "4px 6px", color: "#444" }}>
                        {VENDA_RESPONSAVEL_LABELS[v.responsavel]}
                      </td>
                      <td
                        style={{
                          padding: "4px 6px",
                          textAlign: "right",
                          color: "#444",
                        }}
                      >
                        {formatPercent(v.comissao_percentual)}{" "}
                        <span style={{ fontFamily: "ui-monospace, monospace" }}>
                          {formatBRL(v.comissao_valor)}
                        </span>
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {VENDA_STATUS_LABELS[v.status]}
                        {v.status === "cancelado" ? " ⊘" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #0071E3" }}>
                    <td
                      colSpan={4}
                      style={{
                        padding: "6px",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      Totais (excluindo cancelados):
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "right",
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {formatBRL(currentAgg.liquido)}
                    </td>
                    <td />
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "right",
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {formatBRL(currentAgg.comissao)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </section>
          </>
        )}

        <footer
          style={{
            marginTop: 32,
            paddingTop: 12,
            borderTop: "1px solid #ddd",
            fontSize: 9,
            color: "#999",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>HALO Prospector · DRE confidencial</span>
          <span>{geradoEm}</span>
        </footer>
      </main>
    </>
  );
}

function KpiBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        border: highlight ? "1px solid #0071E3" : "1px solid #ddd",
        background: highlight ? "#f0f7ff" : "#fff",
        borderRadius: 6,
        padding: "8px 10px",
      }}
    >
      <p
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: highlight ? "#0071E3" : "#666",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 14,
          fontFamily: "ui-monospace, monospace",
          fontWeight: 600,
          color: highlight ? "#0071E3" : "#111",
          margin: "2px 0 0",
        }}
      >
        {value}
      </p>
    </div>
  );
}
