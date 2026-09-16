import tesouroJson from "../../data/tesouro.json";

export type TesouroFamily = "selic" | "ipca" | "prefixado";

export type TesouroQuote = {
  family: TesouroFamily;
  name: string;
  maturity: string;
  /** Taxa de compra da manhã. No Selic é o ágio sobre a Selic, não a taxa cheia. */
  buyRate: number;
  sellRate: number;
  unitPrice: number;
  yearsToMaturity: number;
};

export type TesouroSnapshot = {
  generatedAt: string;
  asOf: string;
  source: string;
  quotes: TesouroQuote[];
  ipca2035: { date: string; buyRate: number; unitPrice: number }[];
};

export const tesouro = tesouroJson as TesouroSnapshot;

const FAMILY_LABEL: Record<TesouroFamily, string> = {
  selic: "Pós-fixado à Selic",
  ipca: "Pós-fixado ao IPCA",
  prefixado: "Prefixado",
};

export function familyLabel(family: TesouroFamily): string {
  return FAMILY_LABEL[family];
}

/** Alíquota regressiva de IR de renda fixa (Tesouro, CDB, LC). */
export function incomeTaxRate(years: number): number {
  const days = years * 365;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

export function netOfTax(grossTotalReturn: number, years: number): number {
  return grossTotalReturn * (1 - incomeTaxRate(years));
}

export function cagrFromTotal(total: number, years: number): number {
  if (years <= 0) return NaN;
  return (1 + total) ** (1 / years) - 1;
}

/**
 * Retorno nominal bruto anualizado, carregando até o vencimento, sob uma
 * trajetória constante de Selic e IPCA.
 *
 * Tesouro Selic acompanha a Selic + o ágio da NTN-B Principal equivalente
 * (o "buyRate" do título Selic). IPCA+ combina inflação e juro real travado.
 * Prefixado ignora o caminho: a taxa de hoje está travada.
 */
export function holdToMaturityGrossCagr(
  quote: TesouroQuote,
  selic: number,
  ipca: number,
): number {
  if (quote.family === "selic") return (1 + selic) * (1 + quote.buyRate) - 1;
  if (quote.family === "ipca") return (1 + ipca) * (1 + quote.buyRate) - 1;
  return quote.buyRate;
}

export function holdToMaturityNetCagr(
  quote: TesouroQuote,
  selic: number,
  ipca: number,
): number {
  const gross = holdToMaturityGrossCagr(quote, selic, ipca);
  const total = (1 + gross) ** quote.yearsToMaturity - 1;
  return cagrFromTotal(netOfTax(total, quote.yearsToMaturity), quote.yearsToMaturity);
}

/** Juro real após IR e inflação. */
export function afterTaxRealCagr(netNominalCagr: number, ipca: number): number {
  return (1 + netNominalCagr) / (1 + ipca) - 1;
}

/**
 * Inflação implícita que iguala o prefixado ao IPCA+ de duration parecida.
 * Acima desse número, o IPCA+ vence no vencimento; abaixo, o prefixado vence.
 */
export function breakevenInflation(prefixadoRate: number, ipcaRealRate: number): number {
  return (1 + prefixadoRate) / (1 + ipcaRealRate) - 1;
}

export type ProductProjection = {
  quote: TesouroQuote;
  grossCagr: number;
  netCagr: number;
  realNetCagr: number;
  taxRate: number;
  beatsCdi: boolean;
};

export type HorizonProjection = {
  years: number;
  taxRate: number;
  cdiGross: number;
  cdiNet: number;
  cdiRealNet: number;
  products: ProductProjection[];
  winner: ProductProjection;
};

/**
 * Projeta o CDI e os títulos vigentes num horizonte, assumindo Selic e IPCA
 * constantes. O CDI usa a Selic hipotética (não a cotação de hoje), porque a
 * pergunta é "e se os juros forem X daqui pra frente".
 */
function closestQuote(family: TesouroFamily, years: number, quotes: TesouroQuote[]) {
  const pool = quotes.filter((q) => q.family === family && q.yearsToMaturity >= 0.8);
  if (pool.length === 0) return null;
  return pool.reduce((best, q) =>
    Math.abs(q.yearsToMaturity - years) < Math.abs(best.yearsToMaturity - years) ? q : best,
  );
}

/**
 * Projeta CDI, o prefixado e o IPCA+ mais próximos do horizonte, assumindo
 * Selic e IPCA constantes e carregamento até o vencimento de cada título.
 */
export function projectHorizon(
  years: number,
  selic: number,
  ipca: number,
  quotes: TesouroQuote[] = tesouro.quotes,
): HorizonProjection {
  const taxRate = incomeTaxRate(years);
  const cdiGross = selic;
  const cdiTotal = (1 + cdiGross) ** years - 1;
  const cdiNet = cagrFromTotal(netOfTax(cdiTotal, years), years);
  const cdiRealNet = afterTaxRealCagr(cdiNet, ipca);

  const toProjection = (quote: TesouroQuote, name?: string): ProductProjection => {
    const grossCagr = holdToMaturityGrossCagr(quote, selic, ipca);
    const netCagr = holdToMaturityNetCagr(quote, selic, ipca);
    return {
      quote: name ? { ...quote, name } : quote,
      grossCagr,
      netCagr,
      realNetCagr: afterTaxRealCagr(netCagr, ipca),
      taxRate: incomeTaxRate(quote.yearsToMaturity),
      beatsCdi: netCagr > cdiNet + 1e-6,
    };
  };

  const selicProxy = toProjection({
    family: "selic",
    name: "Tesouro Selic / CDB 100% CDI",
    maturity: tesouro.asOf,
    buyRate: 0,
    sellRate: 0,
    unitPrice: 0,
    yearsToMaturity: years,
  });

  const fatCdiGross = 1.4 * selic;
  const fatCdiTotal = (1 + fatCdiGross) ** years - 1;
  const fatCdiNet = cagrFromTotal(netOfTax(fatCdiTotal, years), years);
  const fatCdi: ProductProjection = {
    quote: {
      family: "selic",
      name: "CDB 140% do CDI",
      maturity: tesouro.asOf,
      buyRate: 0.4,
      sellRate: 0.4,
      unitPrice: 0,
      yearsToMaturity: years,
    },
    grossCagr: fatCdiGross,
    netCagr: fatCdiNet,
    realNetCagr: afterTaxRealCagr(fatCdiNet, ipca),
    taxRate,
    beatsCdi: true,
  };

  const products = [selicProxy, fatCdi];
  const prefix = closestQuote("prefixado", years, quotes);
  const ipcaBond = closestQuote("ipca", years, quotes);
  if (prefix) products.push(toProjection(prefix));
  if (ipcaBond) products.push(toProjection(ipcaBond));

  products.sort((a, b) => b.netCagr - a.netCagr);
  const tesouroProducts = products.filter((p) => !p.quote.name.includes("140%"));
  const winner = tesouroProducts[0] ?? products[0];

  return { years, taxRate, cdiGross, cdiNet, cdiRealNet, products, winner };
}

export type HistoricalHorseRace = {
  years: number;
  from: string;
  to: string;
  cdiCagr: number;
  ipcaCagr: number;
  /** Mark-to-market do Tesouro IPCA+ 2035, se vendido hoje. */
  ipca2035SoldCagr: number;
  /** Juro real que o título pagava na compra. */
  ipca2035LockedReal: number;
  ibovCagr: number;
};

export type CurrentMenuRow = TesouroQuote & {
  impliedNominal: number;
  netCagr: number;
  realNetCagr: number;
  vsCdiNet: number;
  taxRate: number;
};

/** Cardápio vigente, precificado com o IPCA dos últimos 12 meses como cenário-base. */
export function currentMenu(selic: number, ipca: number): CurrentMenuRow[] {
  return tesouro.quotes
    .filter((q) => q.yearsToMaturity >= 0.8)
    .map((q) => {
      const impliedNominal = holdToMaturityGrossCagr(q, selic, ipca);
      const netCagr = holdToMaturityNetCagr(q, selic, ipca);
      const realNetCagr = afterTaxRealCagr(netCagr, ipca);
      const cdiTotal = (1 + selic) ** q.yearsToMaturity - 1;
      const cdiNet = cagrFromTotal(netOfTax(cdiTotal, q.yearsToMaturity), q.yearsToMaturity);
      return {
        ...q,
        impliedNominal,
        netCagr,
        realNetCagr,
        vsCdiNet: netCagr - cdiNet,
        taxRate: incomeTaxRate(q.yearsToMaturity),
      };
    });
}

export function benchmarkQuotes(quotes: TesouroQuote[] = tesouro.quotes) {
  const pick = (family: TesouroFamily, aroundYears: number) => {
    const pool = quotes.filter((q) => q.family === family);
    return pool.reduce((best, q) =>
      Math.abs(q.yearsToMaturity - aroundYears) < Math.abs(best.yearsToMaturity - aroundYears)
        ? q
        : best,
    );
  };
  return {
    ipcaShort: pick("ipca", 3),
    ipcaMid: pick("ipca", 6),
    ipcaLong: pick("ipca", 9),
    prefixShort: pick("prefixado", 3),
    prefixMid: pick("prefixado", 5),
  };
}

export const RATE_PRESETS = [
  {
    id: "hoje",
    name: "Juros como estão",
    summary:
      "A Selic permanece em 14% e o IPCA perto dos 4,2% dos últimos 12 meses. É o cenário em que o CDI continua pagando mais do que o IPCA+ em termos nominais.",
    selicDelta: 0,
    ipca: 0.0422,
  },
  {
    id: "corte",
    name: "Pós-eleição com corte",
    summary:
      "Plano fiscal crível, inflação ancorada, Copom corta a Selic para 10%. O juro real do CDI cai; o do IPCA+ que você já comprou permanece travado.",
    selicDelta: -4,
    ipca: 0.04,
  },
  {
    id: "desancora",
    name: "Sem âncora fiscal",
    summary:
      "Gasto sobe, inflação volta a 7% e a Selic vai a 18%. O CDI nominal dispara, mas o poder de compra é comido. Quem travou IPCA+ a 7,5% reais preserva o que o prefixado perde.",
    selicDelta: 4,
    ipca: 0.07,
  },
  {
    id: "meta",
    name: "Inflação na meta",
    summary:
      "IPCA em 3% — a meta do Banco Central — e Selic em 9%. O juro real do CDI encolhe; o IPCA+ comprado hoje a 7,5% reais vira um contrato caro de se ter deixado passar.",
    selicDelta: -5,
    ipca: 0.03,
  },
] as const;
