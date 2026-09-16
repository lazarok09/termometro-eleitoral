/**
 * Funções estatísticas usadas pelo painel.
 *
 * Convenções:
 *  - Retornos são simples (P_t / P_{t-1} - 1), não logarítmicos.
 *  - Séries de preço são fechamentos ajustados por proventos e desdobramentos,
 *    então retorno já é retorno total.
 *  - Anualização usa 252 pregões.
 */

export const TRADING_DAYS = 252;

export type DatedSeries = { dates: string[]; values: number[] };

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** Desvio padrão amostral (divide por n-1). */
export function stdDev(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  let acc = 0;
  for (const x of xs) acc += (x - m) ** 2;
  return Math.sqrt(acc / (xs.length - 1));
}

export function covariance(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (xs[i] - mx) * (ys[i] - my);
  return acc / (n - 1);
}

export function correlation(xs: number[], ys: number[]): number {
  const sx = stdDev(xs);
  const sy = stdDev(ys);
  if (!sx || !sy) return NaN;
  return covariance(xs, ys) / (sx * sy);
}

/** Percentil por interpolação linear. `p` entre 0 e 1. */
export function quantile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(xs: number[]): number {
  return quantile(xs, 0.5);
}

/** Em que percentil da própria distribuição histórica o valor atual se encontra. */
export function percentileRank(xs: number[], value: number): number {
  if (xs.length === 0) return NaN;
  let below = 0;
  for (const x of xs) if (x <= value) below++;
  return below / xs.length;
}

export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (!prev) {
      out.push(0);
      continue;
    }
    out.push(closes[i] / prev - 1);
  }
  return out;
}

/** Retorno acumulado a partir de retornos diários. */
export function compound(returns: number[]): number {
  let acc = 1;
  for (const r of returns) acc *= 1 + r;
  return acc - 1;
}

export function annualizeReturn(totalReturn: number, periods: number): number {
  if (periods <= 0) return NaN;
  return (1 + totalReturn) ** (TRADING_DAYS / periods) - 1;
}

export function annualizeVol(returns: number[]): number {
  return stdDev(returns) * Math.sqrt(TRADING_DAYS);
}

/** Volatilidade apenas dos dias abaixo do alvo — o risco que realmente incomoda. */
export function downsideDeviation(returns: number[], target = 0): number {
  const below = returns.filter((r) => r < target).map((r) => r - target);
  if (below.length < 2) return NaN;
  let acc = 0;
  for (const x of below) acc += x ** 2;
  return Math.sqrt(acc / below.length) * Math.sqrt(TRADING_DAYS);
}

export type Drawdown = {
  depth: number;
  peakDate: string | null;
  troughDate: string | null;
  recoveryDate: string | null;
};

export function maxDrawdown(dates: string[], closes: number[]): Drawdown {
  let peak = -Infinity;
  let peakDate: string | null = null;
  let worst = 0;
  let worstPeakDate: string | null = null;
  let troughDate: string | null = null;

  for (let i = 0; i < closes.length; i++) {
    if (closes[i] > peak) {
      peak = closes[i];
      peakDate = dates[i];
    }
    const dd = closes[i] / peak - 1;
    if (dd < worst) {
      worst = dd;
      worstPeakDate = peakDate;
      troughDate = dates[i];
    }
  }

  let recoveryDate: string | null = null;
  if (troughDate) {
    const troughIdx = dates.indexOf(troughDate);
    const peakValue = closes[dates.indexOf(worstPeakDate ?? dates[0])];
    for (let i = troughIdx + 1; i < closes.length; i++) {
      if (closes[i] >= peakValue) {
        recoveryDate = dates[i];
        break;
      }
    }
  }

  return { depth: worst, peakDate: worstPeakDate, troughDate, recoveryDate };
}

/**
 * Regressão linear múltipla com intercepto, resolvida pelas equações normais
 * com eliminação gaussiana e pivotamento parcial.
 *
 * `columns` são as séries explicativas já alinhadas com `y`.
 */
export type Regression = {
  intercept: number;
  coefficients: number[];
  rSquared: number;
  observations: number;
};

export function multipleRegression(y: number[], columns: number[][]): Regression | null {
  const n = y.length;
  const k = columns.length;
  if (n <= k + 1 || k === 0) return null;
  if (columns.some((c) => c.length !== n)) return null;

  // Matriz de design com coluna de 1s para o intercepto.
  const design: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [1];
    for (let j = 0; j < k; j++) row.push(columns[j][i]);
    design.push(row);
  }

  const p = k + 1;
  // Monta X'X aumentada com X'y.
  const augmented: number[][] = Array.from({ length: p }, () => new Array(p + 1).fill(0));
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < p; b++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += design[i][a] * design[i][b];
      augmented[a][b] = sum;
    }
    let sumY = 0;
    for (let i = 0; i < n; i++) sumY += design[i][a] * y[i];
    augmented[a][p] = sumY;
  }

  for (let col = 0; col < p; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < p; r++) {
      if (Math.abs(augmented[r][col]) > Math.abs(augmented[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(augmented[pivotRow][col]) < 1e-12) return null;
    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

    const pivot = augmented[col][col];
    for (let c = col; c <= p; c++) augmented[col][c] /= pivot;

    for (let r = 0; r < p; r++) {
      if (r === col) continue;
      const factor = augmented[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= p; c++) augmented[r][c] -= factor * augmented[col][c];
    }
  }

  const beta = augmented.map((row) => row[p]);

  const yMean = mean(y);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    let fitted = 0;
    for (let j = 0; j < p; j++) fitted += beta[j] * design[i][j];
    ssRes += (y[i] - fitted) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }

  return {
    intercept: beta[0],
    coefficients: beta.slice(1),
    rSquared: ssTot === 0 ? NaN : 1 - ssRes / ssTot,
    observations: n,
  };
}

export type SimpleRegression = {
  intercept: number;
  slope: number;
  rSquared: number;
  /** Estatística t do coeficiente angular. Abaixo de ~2 o sinal é fraco. */
  tStat: number;
  observations: number;
};

/** Regressão de uma variável, com erro padrão do coeficiente. */
export function simpleRegression(y: number[], x: number[]): SimpleRegression | null {
  const n = Math.min(y.length, x.length);
  if (n < 10) return null;

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  if (sxx < 1e-12) return null;

  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const fitted = intercept + slope * x[i];
    ssRes += (y[i] - fitted) ** 2;
    ssTot += (y[i] - my) ** 2;
  }

  const residualVariance = ssRes / (n - 2);
  const standardError = Math.sqrt(residualVariance / sxx);

  return {
    intercept,
    slope,
    rSquared: ssTot === 0 ? NaN : 1 - ssRes / ssTot,
    tStat: standardError === 0 ? NaN : slope / standardError,
    observations: n,
  };
}

/** Interseção de várias séries datadas, preservando a ordem cronológica. */
export function alignSeries(series: DatedSeries[]): { dates: string[]; columns: number[][] } {
  if (series.length === 0) return { dates: [], columns: [] };

  const maps = series.map((s) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.dates.length; i++) m.set(s.dates[i], s.values[i]);
    return m;
  });

  const dates = series[0].dates.filter((d) => maps.every((m) => m.has(d)));
  const columns = maps.map((m) => dates.map((d) => m.get(d) as number));
  return { dates, columns };
}

/** Índice do primeiro pregão com data >= `date`. -1 se não houver. */
export function indexOnOrAfter(dates: string[], date: string): number {
  let lo = 0;
  let hi = dates.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] >= date) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return found;
}

/** Índice do último pregão com data <= `date`. -1 se não houver. */
export function indexOnOrBefore(dates: string[], date: string): number {
  let lo = 0;
  let hi = dates.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] <= date) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * Converte a taxa diária do CDI publicada pelo Banco Central (em % ao dia)
 * em fator acumulado por período.
 */
export function cdiFactor(rows: { date: string; value: number }[], from: string, to: string): number {
  let factor = 1;
  for (const row of rows) {
    if (row.date <= from) continue;
    if (row.date > to) break;
    factor *= 1 + row.value / 100;
  }
  return factor;
}
