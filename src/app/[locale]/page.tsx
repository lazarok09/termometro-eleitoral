import { getTranslations, setRequestLocale } from "next-intl/server";
import { analyzeUniverse, getMacroContext, getPriceSeries, getSnapshotMeta } from "@/lib/analytics";
import { currentMenu } from "@/lib/fixed-income";
import { historicalHorseRace } from "@/lib/fixed-income-history";
import { shortDate } from "@/lib/format";
import { Dashboard } from "@/components/dashboard";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MacroHeader } from "@/components/macro-header";
import type { PricePoint } from "@/components/asset-detail";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Footer");
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
      <div className="absolute right-4 top-4 z-20 sm:right-6 lg:right-8">
        <LocaleSwitcher />
      </div>
      <MacroHeader macro={macro} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard assets={assets} series={series} macro={macro} races={races} menu={menu} />
      </main>

      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto w-full max-w-[1400px] space-y-3 px-4 py-6 text-xs leading-relaxed text-muted-foreground sm:px-6 lg:px-8">
          <p>
            <span className="font-medium text-foreground/80">{t("howToReadTitle")} </span>
            {t("howToReadBody")}
          </p>
          <p>
            <span className="font-medium text-foreground/80">{t("dataTitle")} </span>
            {t.rich("dataBody", {
              prices: meta.source.prices,
              macro: meta.source.macro,
              updated: shortDate(meta.generatedAt.slice(0, 10), locale),
              command: (chunks) => (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  {chunks}
                </code>
              ),
            })}
          </p>
          <p>{t("disclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}
