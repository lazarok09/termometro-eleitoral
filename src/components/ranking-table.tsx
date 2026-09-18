"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Banana, ChevronsUpDown, Landmark, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { AssetAnalysis } from "@/lib/analytics";
import { money, percent, ratio, signedPercent, toneForValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SectorFilter = "todas" | "bancos" | "energia" | "baratas";
type ViewId = "risco" | "valuation" | "politica";

const SECTOR_FILTER_IDS: SectorFilter[] = ["todas", "bancos", "energia", "baratas"];
const VIEW_IDS: ViewId[] = ["risco", "valuation", "politica"];

function isBanana(a: AssetAnalysis): boolean {
  const pb = num(a.fundamentals?.priceToBook);
  return pb != null && pb < 1;
}

type Column = {
  id: string;
  label: string;
  help: string;
  /** Valor usado para ordenar. Nulo vai sempre para o fim. */
  value: (a: AssetAnalysis) => number | null;
  render: (a: AssetAnalysis) => React.ReactNode;
  align?: "left" | "right";
  /** Quando true, valores maiores aparecem primeiro na primeira ordenação. */
  highIsFirst?: boolean;
};

function num(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function SensitivityBar({ ratio: value }: { ratio: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  // 1,0 significa que a ação se descola do índice na eleição exatamente como
  // em qualquer outro período. A escala vai de 0,6 a 1,6.
  const pct = Math.max(0, Math.min(1, (value - 0.6) / 1));
  const strong = value >= 1.1;

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", strong ? "bg-amber-400" : "bg-sky-400/70")}
          style={{ width: `${Math.max(4, pct * 100)}%` }}
        />
      </div>
      <span className={cn("tabular w-10 text-right", strong && "text-amber-300")}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function PricePositionCell({ asset }: { asset: AssetAnalysis }) {
  const pct = num(asset.price.percentile);
  const vsMedian = num(asset.price.vsMedian);

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
        {pct != null && (
          <div
            className={cn(
              "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
              pct > 0.5 ? "bg-rose-400" : "bg-emerald-400",
            )}
            style={{ left: `${Math.max(4, Math.min(96, pct * 100))}%` }}
          />
        )}
      </div>
      <span className={cn("tabular w-14 text-right", toneForValue(vsMedian ? -vsMedian : 0))}>
        {signedPercent(vsMedian, 0)}
      </span>
    </div>
  );
}

const STATE_STYLES: Record<string, string> = {
  estatal: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "ex-estatal": "border-orange-400/30 bg-orange-400/10 text-orange-300",
  regulada: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  privada: "border-border bg-muted/40 text-muted-foreground",
};

type TranslateFn = ReturnType<typeof useTranslations<"RankingTable">>;

function buildColumns(t: TranslateFn, weakLabel: string): Record<ViewId, Column[]> {
  const col = (id: string) => ({
    label: t(`columns.${id}.label` as Parameters<TranslateFn>[0]),
    help: t(`columns.${id}.help` as Parameters<TranslateFn>[0]),
  });

  return {
    risco: [
      {
        id: "cagr3y",
        ...col("cagr3y"),
        value: (a) => num(a.performance.cagr3y),
        render: (a) => (
          <span className={cn("tabular", toneForValue(a.performance.cagr3y))}>
            {signedPercent(a.performance.cagr3y)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "excessOverCdi",
        ...col("excessOverCdi"),
        value: (a) => num(a.performance.excessOverCdi),
        render: (a) => (
          <span className={cn("tabular font-medium", toneForValue(a.performance.excessOverCdi))}>
            {signedPercent(a.performance.excessOverCdi)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "vol",
        ...col("vol"),
        value: (a) => num(a.performance.volatility3y),
        render: (a) => <span className="tabular">{percent(a.performance.volatility3y, 0)}</span>,
      },
      {
        id: "sharpe",
        ...col("sharpe"),
        value: (a) => num(a.performance.sharpe3y),
        render: (a) => (
          <span className={cn("tabular font-medium", toneForValue(a.performance.sharpe3y))}>
            {ratio(a.performance.sharpe3y)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "beta",
        ...col("beta"),
        value: (a) => num(a.performance.beta3y),
        render: (a) => <span className="tabular">{ratio(a.performance.beta3y)}</span>,
      },
      {
        id: "dd",
        ...col("dd"),
        value: (a) => num(a.performance.maxDrawdown3y),
        render: (a) => (
          <span className="tabular text-rose-400">{percent(a.performance.maxDrawdown3y, 0)}</span>
        ),
        highIsFirst: true,
      },
    ],
    valuation: [
      {
        id: "vsMedian",
        ...col("vsMedian"),
        value: (a) => num(a.price.vsMedian),
        render: (a) => <PricePositionCell asset={a} />,
      },
      {
        id: "vsHigh",
        ...col("vsHigh"),
        value: (a) => num(a.price.vsHigh52w),
        render: (a) => (
          <span className="tabular text-muted-foreground">{signedPercent(a.price.vsHigh52w, 0)}</span>
        ),
        highIsFirst: true,
      },
      {
        id: "pe",
        ...col("pe"),
        value: (a) => num(a.fundamentals?.trailingPE),
        render: (a) => <span className="tabular">{ratio(a.fundamentals?.trailingPE, 1)}</span>,
      },
      {
        id: "pb",
        ...col("pb"),
        value: (a) => num(a.fundamentals?.priceToBook),
        render: (a) => (
          <span className={cn("tabular", (a.fundamentals?.priceToBook ?? 9) < 1 && "text-emerald-400")}>
            {ratio(a.fundamentals?.priceToBook)}
          </span>
        ),
      },
      {
        id: "dy",
        ...col("dy"),
        value: (a) => num(a.trailingDividendYield),
        render: (a) => (
          <span className="tabular">{percent(a.trailingDividendYield, 1)}</span>
        ),
        highIsFirst: true,
      },
      {
        id: "roe",
        ...col("roe"),
        value: (a) => num(a.fundamentals?.returnOnEquity),
        render: (a) => <span className="tabular">{percent(a.fundamentals?.returnOnEquity, 0)}</span>,
        highIsFirst: true,
      },
    ],
    politica: [
      {
        id: "electionSensitivity",
        ...col("electionSensitivity"),
        value: (a) => num(a.electionSensitivity?.ratio),
        render: (a) => <SensitivityBar ratio={num(a.electionSensitivity?.ratio)} />,
        highIsFirst: true,
      },
      {
        id: "selicBeta",
        ...col("selicBeta"),
        value: (a) => num(a.rateSensitivity.betaPerPoint),
        render: (a) => {
          const beta = num(a.rateSensitivity.betaPerPoint);
          const weak = Math.abs(num(a.rateSensitivity.tStat) ?? 0) < 2;
          return (
            <span className={cn("tabular", weak ? "text-muted-foreground" : toneForValue(beta))}>
              {signedPercent(beta, 1)}
              {weak && <span className="ml-1 text-[10px]">{weakLabel}</span>}
            </span>
          );
        },
      },
      {
        id: "hiking",
        ...col("hiking"),
        value: (a) => num(a.rateSensitivity.excessWhenHiking),
        render: (a) => (
          <span className={cn("tabular", toneForValue(a.rateSensitivity.excessWhenHiking))}>
            {signedPercent(a.rateSensitivity.excessWhenHiking, 0)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "easing",
        ...col("easing"),
        value: (a) => num(a.rateSensitivity.excessWhenEasing),
        render: (a) => (
          <span className={cn("tabular", toneForValue(a.rateSensitivity.excessWhenEasing))}>
            {signedPercent(a.rateSensitivity.excessWhenEasing, 0)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "usdBeta",
        ...col("usdBeta"),
        value: (a) => num(a.factors.betas.usdbrl),
        render: (a) => (
          <span className={cn("tabular", toneForValue(a.factors.betas.usdbrl))}>
            {ratio(a.factors.betas.usdbrl)}
          </span>
        ),
        highIsFirst: true,
      },
      {
        id: "brentBeta",
        ...col("brentBeta"),
        value: (a) => num(a.factors.betas.brent),
        render: (a) => (
          <span className={cn("tabular", toneForValue(a.factors.betas.brent))}>
            {ratio(a.factors.betas.brent)}
          </span>
        ),
        highIsFirst: true,
      },
    ],
  };
}

export function RankingTable({
  assets,
  onSelect,
}: {
  assets: AssetAnalysis[];
  onSelect: (ticker: string) => void;
}) {
  const t = useTranslations("RankingTable");
  const locale = useLocale();
  const [view, setView] = useState<ViewId>("risco");
  const [sortId, setSortId] = useState<string>("sharpe");
  const [descending, setDescending] = useState(true);
  const [onlyStateLinked, setOnlyStateLinked] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("todas");

  const columnsByView = useMemo(() => buildColumns(t, t("weak")), [t]);
  const columns = columnsByView[view];
  const activeViewDescription = t(`views.${view}.description`);

  function changeView(next: ViewId) {
    setView(next);
    const first = columnsByView[next][0];
    setSortId(first.id);
    setDescending(first.highIsFirst ?? true);
  }

  function changeSector(next: SectorFilter) {
    setSectorFilter(next);
    if (next === "bancos" || next === "energia" || next === "baratas") {
      setView("valuation");
      setSortId("pb");
      setDescending(false);
    }
  }

  function toggleSort(column: Column) {
    if (sortId === column.id) {
      setDescending((d) => !d);
    } else {
      setSortId(column.id);
      setDescending(column.highIsFirst ?? true);
    }
  }

  const rows = useMemo(() => {
    let filtered = assets;
    if (sectorFilter === "bancos") filtered = filtered.filter((a) => a.sector === "Bancos");
    if (sectorFilter === "energia") {
      filtered = filtered.filter((a) => a.sector === "Energia Elétrica");
    }
    if (sectorFilter === "baratas") filtered = filtered.filter(isBanana);
    if (onlyStateLinked) filtered = filtered.filter((a) => a.stateControl !== "privada");

    const column = columns.find((c) => c.id === sortId);
    if (!column) return filtered;

    return [...filtered].sort((a, b) => {
      const va = column.value(a);
      const vb = column.value(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return descending ? vb - va : va - vb;
    });
  }, [assets, columns, sortId, descending, onlyStateLinked, sectorFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && changeView(v as ViewId)}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {VIEW_IDS.map((id) => (
            <ToggleGroupItem key={id} value={id} className="px-3 text-xs sm:text-sm">
              {t(`views.${id}.label`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Button
          variant={onlyStateLinked ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyStateLinked((s) => !s)}
          className="gap-2 self-start"
        >
          <Landmark className="size-3.5" />
          {t("stateLinkedOnly")}
        </Button>
        </div>

        <ToggleGroup
          type="single"
          value={sectorFilter}
          onValueChange={(v) => v && changeSector(v as SectorFilter)}
          variant="outline"
          className="w-full justify-start sm:w-auto"
        >
          {SECTOR_FILTER_IDS.map((id) => (
            <ToggleGroupItem key={id} value={id} className="px-3 text-xs sm:text-sm">
              {id === "energia" ? <Zap className="size-3.5" /> : null}
              {id === "baratas" ? <Banana className="size-3.5" /> : null}
              {t(`sectors.${id}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <p className="text-sm text-muted-foreground">
        {(sectorFilter === "bancos" ||
          sectorFilter === "energia" ||
          sectorFilter === "baratas") &&
          t(`sectorHints.${sectorFilter}`)}
        {activeViewDescription}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card/95 backdrop-blur">
                {t("company")}
              </TableHead>
              <TableHead className="text-right">{t("price")}</TableHead>
              {columns.map((column) => {
                const active = sortId === column.id;
                return (
                  <TableHead key={column.id} className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => toggleSort(column)}
                          className={cn(
                            "inline-flex items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 transition-colors hover:text-foreground",
                            active ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {column.label}
                          {active ? (
                            descending ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUp className="size-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-pretty">
                        {column.help}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((asset) => (
              <TableRow
                key={asset.ticker}
                onClick={() => onSelect(asset.ticker)}
                className="cursor-pointer"
              >
                <TableCell className="sticky left-0 z-10 bg-card/95 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{asset.ticker}</span>
                    {isBanana(asset) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Banana className="size-3.5 text-amber-300" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("bananaTooltip", {
                            pb: ratio(asset.fundamentals?.priceToBook),
                          })}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("hidden text-[10px] sm:inline-flex", STATE_STYLES[asset.stateControl])}
                    >
                      {t(`stateControl.${asset.stateControl}`)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{asset.name}</div>
                </TableCell>
                <TableCell className="tabular text-right">
                  {money(asset.price.current, locale)}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.id} className="text-right">
                    {column.render(asset)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">{t("footer")}</p>
    </div>
  );
}
