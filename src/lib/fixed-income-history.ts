import { annualizeReturn, cdiFactor, indexOnOrAfter } from "./quant";
import { snapshot } from "./snapshot";
import { tesouro, type HistoricalHorseRace } from "./fixed-income";

function findIpca2035OnOrBefore(date: string) {
  const series = tesouro.ipca2035;
  let found = series[0];
  for (const row of series) {
    if (row.date > date) break;
    found = row;
  }
  return found;
}

/**
 * Só roda no servidor: compara CDI, IPCA, Ibovespa e o PU de mercado do
 * Tesouro IPCA+ 2035. Importar isto no cliente puxaria 2 MB de cotações.
 */
export function historicalHorseRace(years: number): HistoricalHorseRace | null {
  const to = tesouro.asOf;
  const fromDate = new Date(to);
  fromDate.setFullYear(fromDate.getFullYear() - years);
  const from = fromDate.toISOString().slice(0, 10);

  const cdiTotal = cdiFactor(snapshot.macro.cdiDaily, from, to) - 1;
  const cdiCagr = annualizeReturn(cdiTotal, years * 252);

  const ipcaRows = snapshot.macro.ipcaMonthly.filter((r) => r.date > from && r.date <= to);
  const ipcaTotal = ipcaRows.reduce((acc, r) => acc * (1 + r.value / 100), 1) - 1;
  const ipcaCagr = (1 + ipcaTotal) ** (1 / years) - 1;

  const startBond = findIpca2035OnOrBefore(from);
  const endBond = tesouro.ipca2035[tesouro.ipca2035.length - 1];
  const bondTotal = endBond.unitPrice / startBond.unitPrice - 1;
  const ipca2035SoldCagr = (1 + bondTotal) ** (1 / years) - 1;

  const ibov = snapshot.series["^BVSP"];
  if (!ibov) return null;
  const idx = indexOnOrAfter(ibov.dates, from);
  if (idx < 0) return null;
  const ibovTotal = ibov.closes[ibov.closes.length - 1] / ibov.closes[idx] - 1;
  const ibovCagr = (1 + ibovTotal) ** (1 / years) - 1;

  return {
    years,
    from: startBond.date,
    to: endBond.date,
    cdiCagr,
    ipcaCagr,
    ipca2035SoldCagr,
    ipca2035LockedReal: startBond.buyRate,
    ibovCagr,
  };
}
