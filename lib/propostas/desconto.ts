// ============================================================================
// HALO Prospector — Propostas — Tabela de desconto progressivo por quantidade
// ============================================================================
// Preço de tabela fixo do HALO Smart Ring e desconto progressivo por volume.
// Abaixo de 10 unidades a proposta sai da tabela progressiva e vira
// "condição especial" — o desconto destrava pra edição manual no form.
// ============================================================================

/** Preço de tabela por anel HALO (R$). Default do valor_unitario no create. */
export const HALO_RING_PRECO_UNITARIO = 447.9;

/** Quantidade mínima pra entrar na tabela progressiva de desconto. */
export const QTD_MINIMA_PROGRESSIVA = 10;

export interface FaixaDesconto {
  /** Quantidade mínima (inclusive) da faixa. */
  min: number;
  /** Quantidade máxima (inclusive). null = sem teto (300+). */
  max: number | null;
  /** Percentual de desconto sugerido. */
  percentual: number;
}

/** Faixas de desconto por volume, da menor pra maior quantidade. */
export const FAIXAS_DESCONTO: FaixaDesconto[] = [
  { min: 10, max: 29, percentual: 15 },
  { min: 30, max: 49, percentual: 20 },
  { min: 50, max: 79, percentual: 25 },
  { min: 80, max: 119, percentual: 30 },
  { min: 120, max: 199, percentual: 35 },
  { min: 200, max: 299, percentual: 40 },
  { min: 300, max: null, percentual: 45 },
];

/**
 * Retorna o percentual de desconto da faixa pra uma quantidade.
 * Retorna `null` quando a quantidade está abaixo do mínimo progressivo
 * (< 10 unidades) — nesse caso a proposta é condição especial e o desconto
 * deve ser definido manualmente.
 */
export function descontoPorQuantidade(qtd: number): number | null {
  if (!Number.isFinite(qtd) || qtd < QTD_MINIMA_PROGRESSIVA) return null;
  for (const faixa of FAIXAS_DESCONTO) {
    if (qtd >= faixa.min && (faixa.max === null || qtd <= faixa.max)) {
      return faixa.percentual;
    }
  }
  return null;
}
