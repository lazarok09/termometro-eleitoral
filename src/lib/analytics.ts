import { ELECTIONS, EVENT_WINDOWS, type WindowSpec } from "./elections";
import {
  alignSeries,
  annualizeReturn,
  annualizeVol,
  compound,
  correlation,
  covariance,
  dailyReturns,
  downsideDeviation,
  cdiFactor,
  indexOnOrAfter,
  indexOnOrBefore,
  maxDrawdown,
  mean,
  multipleRegression,
  percentileRank,
  quantile,
  simpleRegression,
  stdDev,
  TRADING_DAYS,
} from "./quant";
import { snapshot, type Fundamentals } from "./snapshot";
import { FACTORS, UNIVERSE, type Asset, type FactorKey } from "./universe";

const IBOV = FACTORS.ibov.symbol;

export type PricePosition = {
  current: number;
  /** Mediana dos últimos 3 anos, na escala de preço de hoje. */
  median3y: number;
  p25: number;
  p75: number;
  min3y: number;
  max3y: number;
  /** Em que percentil da distribuição de 3 anos o preço atual está (0 a 1). */
  percentile: number;
  /** Quanto o preço atual está acima (+) ou abaixo (-) da mediana. */
  vsMedian: number;
  high52w: number;
  low52w: number;
  vsHigh52w: number;
};

export type Performance = {
  totalReturn3y: number;
  cagr3y: number;
  totalReturn1y: number;
  volatility3y: number;
  sharpe3y: number;
  sortino3y: number;
  beta3y: number;
  correlation3y: number;
  maxDrawdown3y: number;
  drawdownTrough: string | null;
  /** CAGR de 3 anos menos o CDI do mesmo período. */
  excessOverCdi: number;
  observations: number;
};

export type FactorExposure = {
  betas: Record<FactorKey, number | null>;
  rSquared: number;
  observations: number;
};

export type WindowResult = {
  windowId: string;
  label: string;
  assetReturn: number;
  ibovReturn: number;
  excess: number;
};

export type ElectionResult = {
  year: number;
  winner: string;
  pricedIn: string;
  note: string;
  windows: WindowResult[];
};

export type ElectionSensitivity = {
  /** Tracking error anualizado nas janelas eleitorais. */
  electionTrackingError: number;
  /** Tracking error anualizado fora das janelas eleitorais. */
  baselineTrackingError: number;
  /** Razão entre os dois. Acima de 1 = a ação se descola mais do índice em eleição. */
  ratio: number;
  electionDays: number;
  baselineDays: number;
};

export type RateSensitivity = {
  /** Excesso de retorno sobre o Ibovespa, em %, para cada 1 p.p. de alta da Selic. */
  betaPerPoint: number | null;
  /**
   * O mesmo beta, encolhido quando a estatística t é fraca. É o valor usado no
   * simulador, para que uma relação sem significância não vire projeção.
   */
  betaShrunk: number | null;
  tStat: number | null;
  rSquared: number | null;
  observations: number;
  /** Retorno anualizado em excesso ao Ibovespa durante ciclos de alta. */
  excessWhenHiking: number | null;
  /** Idem, durante ciclos de queda. */
  excessWhenEasing: number | null;
};

export type AssetAnalysis = Asset & {
  lastDate: string;
  price: PricePosition;
  performance: Performance;
  fundamentals: Fundamentals | null;
  /** Dividendos pagos nos últimos 12 meses sobre o preço atual. */
  trailingDividendYield: number | null;
  factors: FactorExposure;
  elections: ElectionResult[];
  electionSensitivity: ElectionSensitivity | null;
  rateSensitivity: RateSensitivity;
};

export type MacroContext = {
  selicTarget: number;
  selicDate: string;
  cdiAnnualized: number;
  /** IPCA acumulado em 12 meses. */
  ipca12m: number;
  /** Juro real ex-post: CDI de 12 meses descontado o IPCA de 12 meses. */
  realRate: number;
  ibovLevel: number;
  ibovReturn1y: number;
  usdbrl: number;
  brent: number;
  lastDate: string;
};

function symbolSeries(symbol: string) {
  const s = snapshot.series[symbol];
  if (!s) throw new Error(`série ausente no snapshot: ${symbol}`);
  return s;
}

/** Recorta os últimos `years` anos de uma série. */
function sliceYears(dates: string[], years: number) {
  const last = dates[dates.length - 1];
  const cutoff = new Date(last);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const from = cutoff.toISOString().slice(0, 10);
  const start = indexOnOrAfter(dates, from);
  return start < 0 ? 0 : start;
}

function computePricePosition(symbol: string): PricePosition {
  const { dates, closes, prices } = symbolSeries(symbol);
  const start3y = sliceYears(dates, 3);
  const start1y = sliceYears(dates, 1);

  const currentAdj = closes[closes.length - 1];
  const currentPrice = prices[prices.length - 1];
  // Traz os fechamentos ajustados para a escala do preço de hoje, para que a
  // mediana seja comparável ao número que aparece na tela do home broker.
  const scale = currentPrice / currentAdj;

  const window3y = closes.slice(start3y).map((c) => c * scale);
  const window1y = closes.slice(start1y).map((c) => c * scale);

  const median3y = quantile(window3y, 0.5);
  const high52w = Math.max(...window1y);
  const low52w = Math.min(...window1y);

  return {
    current: currentPrice,
    median3y,
    p25: quantile(window3y, 0.25),
    p75: quantile(window3y, 0.75),
    min3y: Math.min(...window3y),
    max3y: Math.max(...window3y),
    percentile: percentileRank(window3y, currentPrice),
    vsMedian: currentPrice / median3y - 1,
    high52w,
    low52w,
    vsHigh52w: currentPrice / high52w - 1,
  };
}

function computePerformance(symbol: string): Performance {
  const asset = symbolSeries(symbol);
  const bench = symbolSeries(IBOV);

  const aligned = alignSeries([
    { dates: asset.dates, values: asset.closes },
    { dates: bench.dates, values: bench.closes },
  ]);

  const start3y = sliceYears(aligned.dates, 3);
  const dates = aligned.dates.slice(start3y);
  const assetCloses = aligned.columns[0].slice(start3y);
  const benchCloses = aligned.columns[1].slice(start3y);

  const assetRet = dailyReturns(assetCloses);
  const benchRet = dailyReturns(benchCloses);

  const totalReturn3y = assetCloses[assetCloses.length - 1] / assetCloses[0] - 1;
  const cagr3y = annualizeReturn(totalReturn3y, assetRet.length);
  const volatility3y = annualizeVol(assetRet);

  const start1y = sliceYears(aligned.dates, 1);
  const closes1y = aligned.columns[0].slice(start1y);
  const totalReturn1y = closes1y[closes1y.length - 1] / closes1y[0] - 1;

  const cdiTotal = cdiFactor(snapshot.macro.cdiDaily, dates[0], dates[dates.length - 1]) - 1;
  const cdiCagr = annualizeReturn(cdiTotal, assetRet.length);
  const excessOverCdi = cagr3y - cdiCagr;

  const benchVar = stdDev(benchRet) ** 2;
  const beta3y = benchVar ? covariance(assetRet, benchRet) / benchVar : NaN;

  const dd = maxDrawdown(dates.slice(1), assetCloses.slice(1));

  // Sharpe e Sortino medidos contra o CDI: no Brasil, a renda fixa é a
  // alternativa real, não uma taxa livre de risco teórica próxima de zero.
  const dailyCdi = (1 + cdiCagr) ** (1 / TRADING_DAYS) - 1;
  const excessDaily = assetRet.map((r) => r - dailyCdi);

  return {
    totalReturn3y,
    cagr3y,
    totalReturn1y,
    volatility3y,
    sharpe3y: volatility3y ? excessOverCdi / volatility3y : NaN,
    sortino3y: excessOverCdi / downsideDeviation(excessDaily),
    beta3y,
    correlation3y: correlation(assetRet, benchRet),
    maxDrawdown3y: dd.depth,
    drawdownTrough: dd.troughDate,
    excessOverCdi,
    observations: assetRet.length,
  };
}

/**
 * Betas de fator sobre 3 anos de retornos diários.
 *
 * Dólar, Brent e Treasury entram residualizados contra o Ibovespa, de modo que
 * cada beta mede o efeito adicional ao que o índice já explica. Sem isso, os
 * fatores se sobrepõem e o simulador contaria o mesmo movimento duas vezes.
 */
function computeFactorExposure(symbol: string): FactorExposure {
  const factorKeys = Object.keys(FACTORS) as FactorKey[];
  const satellites = factorKeys.filter((k) => k !== "ibov");

  const series = [
    { dates: symbolSeries(symbol).dates, values: symbolSeries(symbol).closes },
    { dates: symbolSeries(IBOV).dates, values: symbolSeries(IBOV).closes },
    ...satellites.map((k) => {
      const s = symbolSeries(FACTORS[k].symbol);
      return { dates: s.dates, values: s.closes };
    }),
  ];

  const aligned = alignSeries(series);
  const start = sliceYears(aligned.dates, 3);
  const columns = aligned.columns.map((c) => dailyReturns(c.slice(start)));

  const [assetRet, ibovRet, ...satelliteRet] = columns;
  const empty: FactorExposure = {
    betas: Object.fromEntries(factorKeys.map((k) => [k, null])) as Record<FactorKey, number | null>,
    rSquared: NaN,
    observations: 0,
  };
  if (assetRet.length < 60) return empty;

  const ibovVar = stdDev(ibovRet) ** 2;
  const residualized = satelliteRet.map((col) => {
    if (!ibovVar) return col;
    const b = covariance(col, ibovRet) / ibovVar;
    const a = mean(col) - b * mean(ibovRet);
    return col.map((v, i) => v - (a + b * ibovRet[i]));
  });

  const reg = multipleRegression(assetRet, [ibovRet, ...residualized]);
  if (!reg) return empty;

  const betas = { ibov: reg.coefficients[0] } as Record<FactorKey, number | null>;
  satellites.forEach((key, i) => {
    betas[key] = reg.coefficients[i + 1];
  });

  return { betas, rSquared: reg.rSquared, observations: reg.observations };
}

function windowDates(window: WindowSpec, dates: string[], anchorDate: string | null) {
  if (!anchorDate) return null;
  const anchorIdx = indexOnOrBefore(dates, anchorDate);
  if (anchorIdx < 0) return null;
  const fromIdx = anchorIdx + window.from;
  const toIdx = anchorIdx + window.to;
  if (fromIdx < 0 || toIdx >= dates.length) return null;
  return { fromIdx, toIdx };
}

function computeElections(symbol: string): ElectionResult[] {
  const asset = symbolSeries(symbol);
  const bench = symbolSeries(IBOV);
  const aligned = alignSeries([
    { dates: asset.dates, values: asset.closes },
    { dates: bench.dates, values: bench.closes },
  ]);
  const [assetCloses, benchCloses] = aligned.columns;
  const dates = aligned.dates;

  const results: ElectionResult[] = [];

  for (const election of ELECTIONS) {
    const windows: WindowResult[] = [];

    for (const spec of EVENT_WINDOWS) {
      const anchorDate = spec.anchor === "runoff" ? election.runoff : election.firstRound;
      const range = windowDates(spec, dates, anchorDate);
      if (!range) continue;

      const assetReturn = assetCloses[range.toIdx] / assetCloses[range.fromIdx] - 1;
      const ibovReturn = benchCloses[range.toIdx] / benchCloses[range.fromIdx] - 1;
      windows.push({
        windowId: spec.id,
        label: spec.label,
        assetReturn,
        ibovReturn,
        excess: assetReturn - ibovReturn,
      });
    }

    if (windows.length > 0) {
      results.push({
        year: election.year,
        winner: election.winner,
        pricedIn: election.pricedIn,
        note: election.note,
        windows,
      });
    }
  }

  return results;
}

/**
 * Compara o quanto a ação se descola do Ibovespa em temporada eleitoral
 * (dos 90 pregões antes do 1º turno aos 60 pregões após o 2º) contra o quanto
 * ela se descola no resto do tempo.
 *
 * A normalização importa: uma ação naturalmente volátil se descola do índice
 * sempre, e isso não é sensibilidade eleitoral.
 */
function computeElectionSensitivity(symbol: string): ElectionSensitivity | null {
  const asset = symbolSeries(symbol);
  const bench = symbolSeries(IBOV);
  const aligned = alignSeries([
    { dates: asset.dates, values: asset.closes },
    { dates: bench.dates, values: bench.closes },
  ]);
  const dates = aligned.dates.slice(1);
  const assetRet = dailyReturns(aligned.columns[0]);
  const benchRet = dailyReturns(aligned.columns[1]);
  if (assetRet.length < 250) return null;

  const isElectionDay = new Array(dates.length).fill(false);
  for (const election of ELECTIONS) {
    const anchor = indexOnOrBefore(dates, election.firstRound);
    if (anchor < 0) continue;
    const end = election.runoff ? indexOnOrBefore(dates, election.runoff) : anchor;
    const from = Math.max(0, anchor - 90);
    const to = Math.min(dates.length - 1, end + 60);
    for (let i = from; i <= to; i++) isElectionDay[i] = true;
  }

  const electionExcess: number[] = [];
  const baselineExcess: number[] = [];
  for (let i = 0; i < assetRet.length; i++) {
    const diff = assetRet[i] - benchRet[i];
    if (isElectionDay[i]) electionExcess.push(diff);
    else baselineExcess.push(diff);
  }

  if (electionExcess.length < 120 || baselineExcess.length < 250) return null;

  const electionTrackingError = annualizeVol(electionExcess);
  const baselineTrackingError = annualizeVol(baselineExcess);

  return {
    electionTrackingError,
    baselineTrackingError,
    ratio: baselineTrackingError ? electionTrackingError / baselineTrackingError : NaN,
    electionDays: electionExcess.length,
    baselineDays: baselineExcess.length,
  };
}

/** Valor da Selic meta vigente em cada pregão. */
function selicByDate(dates: string[]): number[] {
  const rows = snapshot.macro.selicTarget;
  const out: number[] = [];
  let cursor = 0;
  let current = rows[0]?.value ?? NaN;
  for (const date of dates) {
    while (cursor < rows.length && rows[cursor].date <= date) {
      current = rows[cursor].value;
      cursor++;
    }
    out.push(current);
  }
  return out;
}

/**
 * Sensibilidade a juros medida em blocos de 21 pregões: o excesso de retorno
 * sobre o Ibovespa é regredido contra a variação da Selic meta no mesmo bloco.
 *
 * Usar o excesso (e não o retorno bruto) evita contar duas vezes o efeito que
 * os juros já exercem sobre o índice inteiro.
 */
function computeRateSensitivity(symbol: string): RateSensitivity {
  const asset = symbolSeries(symbol);
  const bench = symbolSeries(IBOV);
  const aligned = alignSeries([
    { dates: asset.dates, values: asset.closes },
    { dates: bench.dates, values: bench.closes },
  ]);

  const dates = aligned.dates;
  const [assetCloses, benchCloses] = aligned.columns;
  const selic = selicByDate(dates);

  const step = 21;
  const excessBlocks: number[] = [];
  const selicDeltas: number[] = [];

  for (let i = step; i < dates.length; i += step) {
    const assetR = assetCloses[i] / assetCloses[i - step] - 1;
    const benchR = benchCloses[i] / benchCloses[i - step] - 1;
    const delta = selic[i] - selic[i - step];
    excessBlocks.push(assetR - benchR);
    selicDeltas.push(delta);
  }

  const reg = simpleRegression(excessBlocks, selicDeltas);
  // Encolhe o coeficiente quando ele não passa no teste de significância:
  // sem isso, uma relação puramente ruidosa entraria no simulador com peso
  // total só porque a amostra é pequena.
  const shrink = reg ? Math.min(1, Math.abs(reg.tStat) / 2) : 0;

  // Classificação por regime: a Selic está em ciclo de alta ou de queda quando
  // mudou mais de 0,25 p.p. nos 6 meses anteriores.
  const hiking: number[] = [];
  const easing: number[] = [];
  const lookback = 126;
  for (let i = lookback + 1; i < dates.length; i++) {
    const delta = selic[i] - selic[i - lookback];
    const excess =
      assetCloses[i] / assetCloses[i - 1] - benchCloses[i] / benchCloses[i - 1];
    if (delta > 0.25) hiking.push(excess);
    else if (delta < -0.25) easing.push(excess);
  }

  const annualizeExcess = (xs: number[]) =>
    xs.length >= 60 ? (1 + mean(xs)) ** TRADING_DAYS - 1 : null;

  return {
    betaPerPoint: reg ? reg.slope : null,
    betaShrunk: reg ? reg.slope * shrink : null,
    tStat: reg ? reg.tStat : null,
    rSquared: reg ? reg.rSquared : null,
    observations: excessBlocks.length,
    excessWhenHiking: annualizeExcess(hiking),
    excessWhenEasing: annualizeExcess(easing),
  };
}

function trailingDividendYield(symbol: string): number | null {
  const { dividends, prices, dates } = symbolSeries(symbol);
  if (dividends.length === 0) return null;
  const last = dates[dates.length - 1];
  const cutoff = new Date(last);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const from = cutoff.toISOString().slice(0, 10);
  const paid = dividends.filter((d) => d.date > from).reduce((acc, d) => acc + d.amount, 0);
  const price = prices[prices.length - 1];
  return price ? paid / price : null;
}

let cached: AssetAnalysis[] | null = null;

export function analyzeUniverse(): AssetAnalysis[] {
  if (cached) return cached;

  cached = UNIVERSE.map((asset) => {
    const series = symbolSeries(asset.symbol);
    return {
      ...asset,
      lastDate: series.dates[series.dates.length - 1],
      price: computePricePosition(asset.symbol),
      performance: computePerformance(asset.symbol),
      fundamentals: snapshot.fundamentals[asset.symbol] ?? null,
      trailingDividendYield: trailingDividendYield(asset.symbol),
      factors: computeFactorExposure(asset.symbol),
      elections: computeElections(asset.symbol),
      electionSensitivity: computeElectionSensitivity(asset.symbol),
      rateSensitivity: computeRateSensitivity(asset.symbol),
    };
  });

  return cached;
}

export function getMacroContext(): MacroContext {
  const cdi = snapshot.macro.cdiDaily;
  const selic = snapshot.macro.selicTarget;
  const ipca = snapshot.macro.ipcaMonthly;

  const ibov = symbolSeries(IBOV);
  const lastDate = ibov.dates[ibov.dates.length - 1];

  const oneYearAgo = new Date(lastDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const from = oneYearAgo.toISOString().slice(0, 10);

  const cdi12m = cdiFactor(cdi, from, lastDate) - 1;
  const ipca12m = ipca.slice(-12).reduce((acc, m) => acc * (1 + m.value / 100), 1) - 1;

  const idx1y = indexOnOrAfter(ibov.dates, from);
  const ibovReturn1y =
    idx1y >= 0 ? ibov.closes[ibov.closes.length - 1] / ibov.closes[idx1y] - 1 : NaN;

  // A taxa diária do CDI vem em % ao dia; 252 pregões dão a taxa anual.
  const lastCdiDaily = cdi[cdi.length - 1]?.value ?? 0;
  const cdiAnnualized = (1 + lastCdiDaily / 100) ** TRADING_DAYS - 1;

  const usd = symbolSeries(FACTORS.usdbrl.symbol);
  const brent = symbolSeries(FACTORS.brent.symbol);

  return {
    selicTarget: selic[selic.length - 1]?.value ?? NaN,
    selicDate: selic[selic.length - 1]?.date ?? "",
    cdiAnnualized,
    ipca12m,
    realRate: (1 + cdi12m) / (1 + ipca12m) - 1,
    ibovLevel: ibov.prices[ibov.prices.length - 1],
    ibovReturn1y,
    usdbrl: usd.prices[usd.prices.length - 1],
    brent: brent.prices[brent.prices.length - 1],
    lastDate,
  };
}

/** Série de preços (escala de hoje) para os gráficos, reduzida por amostragem. */
export function getPriceSeries(symbol: string, years: number, maxPoints = 400) {
  const { dates, closes, prices } = symbolSeries(symbol);
  const start = sliceYears(dates, years);
  const scale = prices[prices.length - 1] / closes[closes.length - 1];

  const slicedDates = dates.slice(start);
  const slicedCloses = closes.slice(start).map((c) => c * scale);

  const stepSize = Math.max(1, Math.ceil(slicedDates.length / maxPoints));
  const out: { date: string; price: number }[] = [];
  for (let i = 0; i < slicedDates.length; i += stepSize) {
    out.push({ date: slicedDates[i], price: Number(slicedCloses[i].toFixed(2)) });
  }
  const lastIdx = slicedDates.length - 1;
  if (out[out.length - 1]?.date !== slicedDates[lastIdx]) {
    out.push({ date: slicedDates[lastIdx], price: Number(slicedCloses[lastIdx].toFixed(2)) });
  }
  return out;
}

export function getSnapshotMeta() {
  return {
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
  };
}
