"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { AssetAnalysis } from "@/lib/analytics";
import { money, percent, signedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SortId = "percentile" | "ticker" | "vsHigh";

const SORT_IDS: SortId[] = ["percentile", "vsHigh", "ticker"];

/** Posição de um preço dentro da faixa mínimo–máximo, em porcentagem. */
function position(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function PriceDistribution({
  assets,
  onSelect,
}: {
  assets: AssetAnalysis[];
  onSelect: (ticker: string) => void;
}) {
  const t = useTranslations("PriceDistribution");
  const locale = useLocale();
  const [sort, setSort] = useState<SortId>("percentile");

  const rows = useMemo(() => {
    const copy = [...assets];
    if (sort === "ticker") return copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
    if (sort === "vsHigh") return copy.sort((a, b) => a.price.vsHigh52w - b.price.vsHigh52w);
    return copy.sort((a, b) => a.price.percentile - b.price.percentile);
  }, [assets, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("intro")}</p>
        </div>

        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(v) => v && setSort(v as SortId)}
          variant="outline"
        >
          {SORT_IDS.map((id) => (
            <ToggleGroupItem key={id} value={id} className="px-3 text-xs">
              {t(`sorts.${id}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <div className="hidden grid-cols-[110px_1fr_190px] gap-4 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <div>{t("headers.company")}</div>
          <div>{t("headers.range")}</div>
          <div className="text-right">{t("headers.vsMedian")}</div>
        </div>

        {rows.map((asset) => {
          const { price } = asset;
          const left = position(price.p25, price.min3y, price.max3y);
          const right = position(price.p75, price.min3y, price.max3y);
          const medianPos = position(price.median3y, price.min3y, price.max3y);
          const currentPos = position(price.current, price.min3y, price.max3y);
          const expensive = price.vsMedian > 0;

          return (
            <button
              key={asset.ticker}
              type="button"
              onClick={() => onSelect(asset.ticker)}
              className="grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30 sm:grid-cols-[110px_1fr_190px] sm:gap-4"
            >
              <div>
                <div className="text-sm font-medium">{asset.ticker}</div>
                <div className="truncate text-[11px] text-muted-foreground">{asset.name}</div>
              </div>

              <div className="relative h-10">
                <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted/60" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sky-500/35"
                  style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 cursor-help bg-foreground/60"
                      style={{ left: `${medianPos}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("medianTooltip", { value: money(price.median3y, locale) })}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full border-2 border-background",
                        expensive ? "bg-rose-400" : "bg-emerald-400",
                      )}
                      style={{ left: `${currentPos}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="tabular space-y-0.5 text-xs">
                      <div>{t("todayTooltip", { value: money(price.current, locale) })}</div>
                      <div className="text-muted-foreground">
                        {t("percentileTooltip", {
                          value: percent(price.percentile, 0),
                        })}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>

                <div className="tabular absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-muted-foreground">
                  <span>{money(price.min3y, locale)}</span>
                  <span>{money(price.max3y, locale)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-right">
                  <div className="tabular text-sm font-semibold">
                    {money(price.current, locale)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("high52w", { value: money(price.high52w, locale) })}
                  </div>
                </div>
                <div
                  className={cn(
                    "tabular w-[74px] rounded-md px-2 py-1 text-right text-xs font-medium",
                    expensive
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-emerald-500/15 text-emerald-300",
                  )}
                >
                  {signedPercent(price.vsMedian, 0)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("footer")}</p>
    </div>
  );
}
