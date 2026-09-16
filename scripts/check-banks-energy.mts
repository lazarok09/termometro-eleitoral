import { analyzeUniverse } from "../src/lib/analytics";
const rows = analyzeUniverse();
function line(r: typeof rows[0]) {
  const f = r.fundamentals;
  return [
    r.ticker.padEnd(8),
    r.price.current.toFixed(2).padStart(7),
    ((r.price.vsMedian*100).toFixed(0)+"%").padStart(6),
    (f?.trailingPE?.toFixed(1) ?? "-").padStart(6),
    (f?.priceToBook?.toFixed(2) ?? "-").padStart(6),
    ((r.trailingDividendYield!=null ? r.trailingDividendYield*100 : NaN).toFixed(1)+"%").padStart(6),
    ((r.performance.cagr3y*100).toFixed(1)+"%").padStart(7),
    r.performance.sharpe3y.toFixed(2).padStart(6),
    ((r.performance.excessOverCdi*100).toFixed(1)+"%").padStart(7),
  ].join(" ");
}
console.log("tick     preço  vsMed    P/L   P/VP    DY   CAGR  Sharpe  vsCDI");
console.log("\n=== BANCOS ===");
for (const r of rows.filter(x=>x.sector==="Bancos").sort((a,b)=>(a.fundamentals?.priceToBook??9)-(b.fundamentals?.priceToBook??9))) console.log(line(r));
console.log("\n=== ENERGIA ===");
for (const r of rows.filter(x=>x.sector==="Energia Elétrica").sort((a,b)=>(a.fundamentals?.priceToBook??9)-(b.fundamentals?.priceToBook??9))) console.log(line(r));
