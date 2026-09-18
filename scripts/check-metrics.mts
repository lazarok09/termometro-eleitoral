import { analyzeUniverse, getMacroContext } from "../src/lib/analytics";

const macro = getMacroContext();
console.log("=== MACRO ===");
console.log("data:", macro.lastDate, "| Selic:", macro.selicTarget + "%", "| CDI a.a.:", (macro.cdiAnnualized*100).toFixed(2)+"%");
console.log("IPCA 12m:", (macro.ipca12m*100).toFixed(2)+"%", "| juro real:", (macro.realRate*100).toFixed(2)+"%");
console.log("Ibov:", macro.ibovLevel.toFixed(0), "| 12m:", (macro.ibovReturn1y*100).toFixed(1)+"%", "| USD:", macro.usdbrl, "| Brent:", macro.brent);

const rows = analyzeUniverse();
console.log("\n=== METRICAS (3 anos) ===");
console.log("tick   preço   med3a   %med   CAGR    vol    Sharpe  beta   DD     P/L    P/VP   DY     sensEl  selicB");
for (const r of rows) {
  const f = r.fundamentals;
  console.log(
    r.ticker.padEnd(7),
    r.price.current.toFixed(2).padStart(7),
    r.price.median3y.toFixed(2).padStart(7),
    ((r.price.vsMedian*100).toFixed(0)+"%").padStart(6),
    ((r.performance.cagr3y*100).toFixed(1)+"%").padStart(7),
    ((r.performance.volatility3y*100).toFixed(0)+"%").padStart(6),
    r.performance.sharpe3y.toFixed(2).padStart(7),
    r.performance.beta3y.toFixed(2).padStart(6),
    ((r.performance.maxDrawdown3y*100).toFixed(0)+"%").padStart(6),
    (f?.trailingPE?.toFixed(1) ?? "-").padStart(6),
    (f?.priceToBook?.toFixed(2) ?? "-").padStart(6),
    ((r.trailingDividendYield!=null ? (r.trailingDividendYield*100).toFixed(1) : "-")+"%").padStart(6),
    (r.electionSensitivity?.ratio.toFixed(2) ?? "-").padStart(7),
    (r.rateSensitivity.betaPerPoint!=null ? (r.rateSensitivity.betaPerPoint*100).toFixed(1) : "-").padStart(7),
  );
}

const petr = rows.find(r=>r.ticker==="PETR4")!;
console.log("\n=== PETR4 fatores ===", JSON.stringify(petr.factors));
console.log("=== PETR4 eleições ===");
for (const e of petr.elections) {
  console.log(" ", e.year);
  for (const w of e.windows) console.log("   ", w.windowId.padEnd(26), (w.assetReturn*100).toFixed(1).padStart(7)+"%", "ibov", (w.ibovReturn*100).toFixed(1).padStart(7)+"%", "excesso", (w.excess*100).toFixed(1).padStart(7)+"%");
}
console.log("\n=== PETR4 juros ===", JSON.stringify(petr.rateSensitivity));
