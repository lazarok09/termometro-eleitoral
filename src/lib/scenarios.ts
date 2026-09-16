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
  name: string;
  summary: string;
  shock: Shock;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "neutral",
    name: "Nada muda",
    summary:
      "A eleição confirma o que já estava nos preços. Juros, câmbio e petróleo seguem onde estão. Serve de linha de base para comparar todo o resto.",
    shock: { ibov: 0, usdbrl: 0, brent: 0, ust10y: 0, selic: 0 },
  },
  {
    id: "promarket",
    name: "Virada pró-mercado",
    summary:
      "Resultado lido como favorável a disciplina fiscal e privatizações. O real se valoriza, a curva de juros fecha e o Copom consegue cortar a Selic.",
    shock: { ibov: 0.2, usdbrl: -0.08, brent: 0, ust10y: 0, selic: -3 },
  },
  {
    id: "fiscalanchor",
    name: "Continuidade com âncora fiscal",
    summary:
      "O governo eleito apresenta um plano fiscal que o mercado considera crível. A alta é menor que na virada, mas o canal de juros funciona igual.",
    shock: { ibov: 0.08, usdbrl: -0.03, brent: 0, ust10y: 0, selic: -1.5 },
  },
  {
    id: "fiscaldrift",
    name: "Sem âncora fiscal",
    summary:
      "Gasto público acelera, a dívida piora e o mercado passa a exigir prêmio. O real se desvaloriza e o Banco Central volta a subir juros.",
    shock: { ibov: -0.18, usdbrl: 0.14, brent: 0, ust10y: 0.05, selic: 2.5 },
  },
  {
    id: "oilshock",
    name: "Choque de petróleo",
    summary:
      "Brent dispara por tensão geopolítica. Bom para produtores, ruim para a inflação — e reabre a discussão sobre política de preços na Petrobras.",
    shock: { ibov: 0.04, usdbrl: -0.02, brent: 0.3, ust10y: 0.02, selic: 0.5 },
  },
  {
    id: "riskoff",
    name: "Aversão global a risco",
    summary:
      "O problema vem de fora: juro longo americano sobe, o dólar se fortalece e o capital estrangeiro sai de emergentes. A eleição vira detalhe.",
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

export const SHOCK_CONTROLS = [
  {
    key: "ibov" as const,
    label: "Ibovespa",
    help: "O movimento do mercado como um todo.",
    min: -0.4,
    max: 0.4,
    step: 0.01,
    unit: "%",
  },
  {
    key: "selic" as const,
    label: "Selic",
    help: "Variação da taxa básica, em pontos percentuais.",
    min: -5,
    max: 5,
    step: 0.25,
    unit: "p.p.",
  },
  {
    key: "usdbrl" as const,
    label: "Dólar",
    help: "Alta significa real mais fraco.",
    min: -0.25,
    max: 0.35,
    step: 0.01,
    unit: "%",
  },
  {
    key: "brent" as const,
    label: "Petróleo Brent",
    help: "Preço da commodity no mercado internacional.",
    min: -0.4,
    max: 0.5,
    step: 0.01,
    unit: "%",
  },
  {
    key: "ust10y" as const,
    label: "Treasury 10 anos",
    help: "Juro longo americano: alta costuma drenar capital de emergentes.",
    min: -0.3,
    max: 0.4,
    step: 0.01,
    unit: "%",
  },
];
