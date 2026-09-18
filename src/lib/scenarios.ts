import type { AssetAnalysis } from "./analytics";

/**
 * Choques aplicados sobre um horizonte de aproximadamente 6 meses.
 * Retornos em fração (0.18 = +18%); Selic em pontos percentuais.
 */
export type Shock = {
  ibov: number;
  usdbrl: number;
  brent: number;
  ust10y: number;
  selic: number;
};

export type Scenario = {
  id: string;
  shock: Shock;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "neutral",
    shock: { ibov: 0, usdbrl: 0, brent: 0, ust10y: 0, selic: 0 },
  },
  {
    id: "promarket",
    shock: { ibov: 0.2, usdbrl: -0.08, brent: 0, ust10y: 0, selic: -3 },
  },
  {
    id: "fiscalanchor",
    shock: { ibov: 0.08, usdbrl: -0.03, brent: 0, ust10y: 0, selic: -1.5 },
  },
  {
    id: "fiscaldrift",
    shock: { ibov: -0.18, usdbrl: 0.14, brent: 0, ust10y: 0.05, selic: 2.5 },
  },
  {
    id: "oilshock",
    shock: { ibov: 0.04, usdbrl: -0.02, brent: 0.3, ust10y: 0.02, selic: 0.5 },
  },
  {
    id: "riskoff",
    shock: { ibov: -0.22, usdbrl: 0.16, brent: -0.18, ust10y: 0.2, selic: 1 },
  },
];

export type Projection = {
  ticker: string;
  name: string;
  /** Retorno total estimado no cenário. */
  expected: number;
  /** Decomposição por canal, para mostrar de onde vem o número. */
  contributions: {
    ibov: number;
    usdbrl: number;
    brent: number;
    ust10y: number;
    selic: number;
  };
  /** Retorno acima (ou abaixo) do próprio Ibovespa no cenário. */
  vsIbov: number;
  /** Retorno acima do CDI acumulado no horizonte. */
  vsCdi: number;
};

/**
 * Projeta o retorno de cada ação combinando os betas estimados.
 *
 * Os betas de dólar, Brent e Treasury são residualizados contra o Ibovespa,
 * então medem efeito incremental. O canal da Selic vem do excesso de retorno
 * sobre o índice, pela mesma razão: evitar contar duas vezes o mesmo impulso.
 */
export function projectScenario(
  assets: AssetAnalysis[],
  shock: Shock,
  cdiAnnualized: number,
  horizonMonths = 6,
): Projection[] {
  const cdiOverHorizon = (1 + cdiAnnualized) ** (horizonMonths / 12) - 1;

  return assets
    .map((asset) => {
      const betas = asset.factors.betas;
      const contributions = {
        ibov: (betas.ibov ?? 1) * shock.ibov,
        usdbrl: (betas.usdbrl ?? 0) * shock.usdbrl,
        brent: (betas.brent ?? 0) * shock.brent,
        ust10y: (betas.ust10y ?? 0) * shock.ust10y,
        selic: (asset.rateSensitivity.betaShrunk ?? 0) * shock.selic,
      };

      const expected =
        contributions.ibov +
        contributions.usdbrl +
        contributions.brent +
        contributions.ust10y +
        contributions.selic;

      return {
        ticker: asset.ticker,
        name: asset.name,
        expected,
        contributions,
        vsIbov: expected - shock.ibov,
        vsCdi: expected - cdiOverHorizon,
      };
    })
    .sort((a, b) => b.expected - a.expected);
}

/** Labels/help: `ScenarioSimulator.shocks.{key}` in messages. */
export const SHOCK_CONTROLS = [
  {
    key: "ibov" as const,
    min: -0.4,
    max: 0.4,
    step: 0.01,
    unit: "%",
  },
  {
    key: "selic" as const,
    min: -5,
    max: 5,
    step: 0.25,
    unit: "p.p.",
  },
  {
    key: "usdbrl" as const,
    min: -0.25,
    max: 0.35,
    step: 0.01,
    unit: "%",
  },
  {
    key: "brent" as const,
    min: -0.4,
    max: 0.5,
    step: 0.01,
    unit: "%",
  },
  {
    key: "ust10y" as const,
    min: -0.3,
    max: 0.4,
    step: 0.01,
    unit: "%",
  },
];
