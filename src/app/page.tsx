import { analyzeUniverse, getMacroContext, getPriceSeries, getSnapshotMeta } from "@/lib/analytics";
import { currentMenu } from "@/lib/fixed-income";
import { historicalHorseRace } from "@/lib/fixed-income-history";
import { shortDate } from "@/lib/format";
import { Dashboard } from "@/components/dashboard";
import { MacroHeader } from "@/components/macro-header";
import type { PricePoint } from "@/components/asset-detail";

export default function Home() {
  const assets = analyzeUniverse();
  const macro = getMacroContext();
  const meta = getSnapshotMeta();
  const races = [1, 3, 5, 10]
    .map(historicalHorseRace)
    .filter((r): r is NonNullable<typeof r> => r != null);
  const menu = currentMenu(macro.cdiAnnualized, macro.ipca12m);

  const series: Record<string, PricePoint[]> = {};
  for (const asset of assets) {
    series[asset.ticker] = getPriceSeries(asset.symbol, 3, 260);
  }

  return (
    <div className="flex min-h-full flex-col">
      <MacroHeader macro={macro} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard assets={assets} series={series} macro={macro} races={races} menu={menu} />
      </main>

      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-[1400px] space-y-3 px-4 py-6 text-xs leading-relaxed text-muted-foreground sm:px-6 lg:px-8">
          <p>
            <span className="font-medium text-foreground/80">Como ler este painel. </span>
            Tudo aqui é medição do passado. Betas, Sharpe e sensibilidade eleitoral
            descrevem como essas ações se comportaram, não como vão se comportar. O
            próprio histórico mostra o limite do exercício: em 2014 o mercado passou
            meses precificando uma alternância que não veio, e em 2022 a eleição mal
            mexeu nos preços enquanto o estrago apareceu depois, na transição.
          </p>
          <p>
            <span className="font-medium text-foreground/80">Dados. </span>
            Preços: {meta.source.prices}. Macro: {meta.source.macro}. Tesouro
            Direto: taxas oficiais do Tesouro Transparente. Série desde 2013,
            atualizada em {shortDate(meta.generatedAt.slice(0, 10))}. Rode{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              npm run fetch-data
            </code>{" "}
            para buscar cotações novas.
          </p>
          <p>
            Conteúdo informativo e educacional. Não é recomendação de investimento,
            análise de valores mobiliários nem oferta de compra ou venda.
          </p>
        </div>
      </footer>
    </div>
  );
}
