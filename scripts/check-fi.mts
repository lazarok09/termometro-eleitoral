import { currentMenu, projectHorizon, breakevenInflation, benchmarkQuotes } from "../src/lib/fixed-income";
import { historicalHorseRace } from "../src/lib/fixed-income-history";

const selic = 0.139; // approx CDI
const ipca = 0.0422;
const b = benchmarkQuotes();
console.log('benchmarks', b.ipcaShort.name, b.ipcaShort.buyRate, b.prefixShort.name, b.prefixShort.buyRate);
console.log('breakeven 2029', breakevenInflation(b.prefixShort.buyRate, b.ipcaShort.buyRate));

console.log('\n=== menu hoje ===');
for (const r of currentMenu(selic, ipca)) {
  console.log(r.family.padEnd(10), r.name.padEnd(26), 'bruto', (r.impliedNominal*100).toFixed(1), 'liq', (r.netCagr*100).toFixed(1), 'real liq', (r.realNetCagr*100).toFixed(1), 'vs CDI', (r.vsCdiNet*100).toFixed(1));
}

for (const years of [2.3, 5.3, 8.7]) {
  const p = projectHorizon(years, selic, ipca);
  console.log('\nhorizonte', years, 'vencedor', p.winner.quote.name, (p.winner.netCagr*100).toFixed(2), 'CDI net', (p.cdiNet*100).toFixed(2));
}
const pCut = projectHorizon(5.3, 0.10, 0.04);
console.log('\ncorte 5y vencedor', pCut.winner.quote.name, (pCut.winner.netCagr*100).toFixed(2), 'CDI', (pCut.cdiNet*100).toFixed(2));
const pBad = projectHorizon(5.3, 0.18, 0.07);
console.log('desancora 5y vencedor', pBad.winner.quote.name, (pBad.winner.netCagr*100).toFixed(2), 'CDI', (pBad.cdiNet*100).toFixed(2));

for (const y of [1,3,5,10]) {
  console.log('\nhorse', y, historicalHorseRace(y));
}
