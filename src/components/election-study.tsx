"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { AssetAnalysis } from "@/lib/analytics";
import {
  ELECTIONS,
  EVENT_WINDOWS,
  windowDescriptionKey,
  windowLabelKey,
} from "@/lib/elections";
import { signedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Verde forte para excesso positivo, vermelho para negativo. Escala até ±25%. */
function heatStyle(excess: number | null) {
  if (excess == null || !Number.isFinite(excess)) {
    return { className: "text-muted-foreground/50", style: undefined };
  }
  const intensity = Math.min(1, Math.abs(excess) / 0.25);
  const color = excess >= 0 ? "16 185 129" : "244 63 94";
  return {
    className: excess >= 0 ? "text-emerald-100" : "text-rose-100",
    style: { backgroundColor: `rgb(${color} / ${(0.08 + intensity * 0.55).toFixed(2)})` },
  };
}

export function ElectionStudy({
  assets,
  onSelect,
}: {
  assets: AssetAnalysis[];
  onSelect: (ticker: string) => void;
}) {
  const t = useTranslations("ElectionStudy");
  const tElections = useTranslations("Elections");
  const [year, setYear] = useState(String(ELECTIONS[ELECTIONS.length - 1].year));
  const election = ELECTIONS.find((e) => String(e.year) === year)!;

  const rows = useMemo(() => {
    return assets
      .map((asset) => {
        const result = asset.elections.find((e) => e.year === election.year);
        const byWindow = new Map(result?.windows.map((w) => [w.windowId, w]) ?? []);
        const pre = byWindow.get("pre90")?.excess ?? null;
        return { asset, byWindow, pre };
      })
      .sort((a, b) => (b.pre ?? -Infinity) - (a.pre ?? -Infinity));
  }, [assets, election.year]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("intro")}</p>
        </div>

        <ToggleGroup
          type="single"
          value={year}
          onValueChange={(v) => v && setYear(v)}
          variant="outline"
        >
          {ELECTIONS.map((e) => (
            <ToggleGroupItem key={e.year} value={String(e.year)} className="px-4">
              {e.year}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {t("winnerBadge")}
            </Badge>
            <span className="text-sm font-medium">
              {tElections(`${election.year}.winner`)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/80">{t("pricedInLabel")} </span>
            {tElections(`${election.year}.pricedIn`)}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:border-l sm:border-border/60 sm:pl-4">
          <span className="font-medium text-foreground/80">{t("noteLabel")} </span>
          {tElections(`${election.year}.note`)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="sticky left-0 z-10 bg-card/95 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground backdrop-blur">
                {t("companyColumn")}
              </th>
              {EVENT_WINDOWS.map((w) => (
                <th key={w.id} className="px-2 py-2.5 text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs font-medium text-muted-foreground">
                        {tElections(windowLabelKey(w.id))}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-pretty">
                      {tElections(windowDescriptionKey(w.id))}
                    </TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ asset, byWindow }) => (
              <tr
                key={asset.ticker}
                onClick={() => onSelect(asset.ticker)}
                className="cursor-pointer border-b border-border/30 last:border-0 hover:bg-accent/30"
              >
                <td className="sticky left-0 z-10 bg-card/95 px-3 py-2 backdrop-blur">
                  <div className="font-medium">{asset.ticker}</div>
                  <div className="text-[11px] text-muted-foreground">{asset.name}</div>
                </td>
                {EVENT_WINDOWS.map((w) => {
                  const cell = byWindow.get(w.id);
                  const heat = heatStyle(cell?.excess ?? null);
                  return (
                    <td key={w.id} className="px-2 py-2 text-right">
                      {cell ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "tabular inline-block min-w-[62px] cursor-help rounded px-1.5 py-1 text-xs font-medium",
                                heat.className,
                              )}
                              style={heat.style}
                            >
                              {signedPercent(cell.excess, 1)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="tabular space-y-0.5 text-xs">
                              <div>
                                {asset.ticker}: {signedPercent(cell.assetReturn)}
                              </div>
                              <div className="text-muted-foreground">
                                {t("ibovespaTooltip", {
                                  return: signedPercent(cell.ibovReturn),
                                })}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          {t("noSeries")}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}
