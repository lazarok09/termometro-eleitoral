"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MacroContext } from "@/lib/analytics";
import {
  RATE_PRESETS,
  benchmarkQuotes,
  breakevenInflation,
  projectHorizon,
  tesouro,
  type CurrentMenuRow,
  type HistoricalHorseRace,
  type TesouroFamily,
} from "@/lib/fixed-income";
import { monthYear, percent, shortDate, signedPercent, toneForValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const HORIZONS = [
  { id: "3", years: 3 },
  { id: "5", years: 5 },
  { id: "9", years: 9 },
] as const;

const FAMILY_TONE: Record<string, string> = {
  selic: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  ipca: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  prefixado: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

function maturityYear(name: string): string {
  const match = name.match(/(\d{4})\s*$/);
  return match?.[1] ?? name;
}

function formatDecimal(value: number, digits: number, locale: string): string {
  return value.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function displayProductName(
  name: string,
  tLib: ReturnType<typeof useTranslations<"FixedIncomeLib">>,
): string {
  if (name.includes("140%")) return tLib("products.cdb140");
  if (name === "Tesouro Selic / CDB 100% CDI") return tLib("products.selicCdi");
  return name;
}

export function FixedIncomePanel({
  macro,
  races,
  menu,
}: {
  macro: MacroContext;
  races: HistoricalHorseRace[];
  menu: CurrentMenuRow[];
}) {
  const t = useTranslations("FixedIncome");
  const tLib = useTranslations("FixedIncomeLib");
  const locale = useLocale();

  const [horizonId, setHorizonId] = useState("5");
  const [presetId, setPresetId] = useState("hoje");
  const [selicPct, setSelicPct] = useState(macro.selicTarget);
  const [ipcaPct, setIpcaPct] = useState(Number((macro.ipca12m * 100).toFixed(1)));

  const years = HORIZONS.find((h) => h.id === horizonId)!.years;
  const selic = selicPct / 100;
  const ipca = ipcaPct / 100;

  const projection = useMemo(
    () => projectHorizon(years, selic, ipca),
    [years, selic, ipca],
  );
  const quotes = benchmarkQuotes();
  const breakeven = breakevenInflation(quotes.prefixShort.buyRate, quotes.ipcaShort.buyRate);

  const ipcaToday = tesouro.ipca2035[tesouro.ipca2035.length - 1];
  const chartData = tesouro.ipca2035
    .filter((p) => p.date >= "2013-01-01")
    .map((p) => ({ date: p.date, rate: Number((p.buyRate * 100).toFixed(2)) }));

  const winnerIsIpca = projection.winner.quote.family === "ipca";
  const winnerIsPrefix = projection.winner.quote.name.includes("Prefixado");
  const winnerIsFatCdi = projection.winner.quote.name.includes("140%");
  const winnerIsSelic =
    projection.winner.quote.family === "selic" && !winnerIsFatCdi;

  function applyPreset(id: string) {
    const preset = RATE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    if (id === "hoje") {
      setSelicPct(macro.selicTarget);
      setIpcaPct(Number((macro.ipca12m * 100).toFixed(1)));
      return;
    }
    setSelicPct(macro.selicTarget + preset.selicDelta);
    setIpcaPct(Number((preset.ipca * 100).toFixed(1)));
  }

  function onSelicChange(value: number) {
    setSelicPct(value);
    setPresetId("custom");
  }

  function onIpcaChange(value: number) {
    setIpcaPct(value);
    setPresetId("custom");
  }

  const race3 = races.find((r) => r.years === 3);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
          {t("directAnswer.badge")}
        </Badge>
        <h3 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
          {t("directAnswer.title")}
        </h3>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          {t("directAnswer.body1", {
            ipcaRate: percent(quotes.ipcaShort.buyRate, 2),
            ipca12m: percent(macro.ipca12m, 2),
            nominal: percent((1 + macro.ipca12m) * (1 + quotes.ipcaShort.buyRate) - 1, 1),
            cdi: percent(macro.cdiAnnualized, 2),
            prefixRate: percent(quotes.prefixShort.buyRate, 2),
            breakeven: percent(breakeven, 1),
          })}
        </p>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          {t.rich("directAnswer.body2", {
            midRate: percent(quotes.ipcaMid.buyRate, 2),
            emphasis: (chunks) => <em>{chunks}</em>,
          })}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <VerdictCard
          title={t("verdicts.selic.title")}
          family="selic"
          familyLabel={tLib("families.selic")}
          rate={percent(macro.cdiAnnualized, 2)}
          rateHint={t("verdicts.selic.rateHint")}
          body={t("verdicts.selic.body")}
        />
        <VerdictCard
          title={t("verdicts.prefixado.title")}
          family="prefixado"
          familyLabel={tLib("families.prefixado")}
          rate={percent(quotes.prefixMid.buyRate, 2)}
          rateHint={t("verdicts.prefixado.rateHint", {
            year: maturityYear(quotes.prefixMid.name),
          })}
          body={t("verdicts.prefixado.body")}
        />
        <VerdictCard
          title={t("verdicts.ipca.title")}
          family="ipca"
          familyLabel={tLib("families.ipca")}
          rate={t("menu.ipcaPlus", { rate: percent(quotes.ipcaMid.buyRate, 2) })}
          rateHint={t("verdicts.ipca.rateHint", {
            year: maturityYear(quotes.ipcaMid.name),
          })}
          body={t("verdicts.ipca.body")}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{t("scenarios.title")}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("scenarios.intro")}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {RATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors",
                presetId === preset.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
              )}
            >
              <div className="text-sm font-medium">{t(`presets.${preset.id}.name`)}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t(`presets.${preset.id}.summary`)}
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("scenarios.hypothesis")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-medium">{t("scenarios.horizon")}</div>
                <ToggleGroup
                  type="single"
                  value={horizonId}
                  onValueChange={(v) => v && setHorizonId(v)}
                  variant="outline"
                  className="w-full"
                >
                  {HORIZONS.map((h) => (
                    <ToggleGroupItem key={h.id} value={h.id} className="flex-1">
                      {t(`horizons.${h.id}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{t("scenarios.selicAvg")}</span>
                  <span className="tabular text-sm font-semibold">
                    {formatDecimal(selicPct, 2, locale)}%
                  </span>
                </div>
                <Slider
                  className="mt-2"
                  min={8}
                  max={20}
                  step={0.25}
                  value={[selicPct]}
                  onValueChange={([v]) => onSelicChange(v)}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{t("scenarios.ipcaAvg")}</span>
                  <span className="tabular text-sm font-semibold">
                    {formatDecimal(ipcaPct, 1, locale)}%
                  </span>
                </div>
                <Slider
                  className="mt-2"
                  min={2}
                  max={10}
                  step={0.1}
                  value={[ipcaPct]}
                  onValueChange={([v]) => onIpcaChange(v)}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("scenarios.breakevenNote", { breakeven: percent(breakeven, 1) })}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div
              className={cn(
                "rounded-xl border px-4 py-3",
                winnerIsIpca && "border-emerald-400/30 bg-emerald-400/10",
                winnerIsPrefix && "border-amber-400/30 bg-amber-400/10",
                winnerIsSelic && "border-sky-400/30 bg-sky-400/10",
                winnerIsFatCdi && "border-violet-400/30 bg-violet-400/10",
              )}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("scenarios.bestNet")}
              </div>
              <div className="mt-1 text-lg font-semibold">
                {displayProductName(projection.winner.quote.name, tLib)}
              </div>
              <div className="tabular text-sm text-muted-foreground">
                {t("scenarios.winnerLine", {
                  net: percent(projection.winner.netCagr, 2),
                  real: percent(projection.winner.realNetCagr, 2),
                })}
              </div>
            </div>

            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/40">
              {projection.products.map((p) => {
                const maxNet = Math.max(...projection.products.map((x) => x.netCagr));
                const width = (p.netCagr / maxNet) * 100;
                const isWinner = p.quote.name === projection.winner.quote.name;
                return (
                  <div
                    key={p.quote.name}
                    className={cn("px-4 py-3", isWinner && "bg-primary/5")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {displayProductName(p.quote.name, tLib)}
                          </span>
                          {p.quote.family !== "selic" && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", FAMILY_TONE[p.quote.family])}
                            >
                              {tLib(`families.${p.quote.family}`)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {t("scenarios.productMeta", {
                            gross: percent(p.grossCagr, 1),
                            tax: percent(p.taxRate, 1),
                            years: formatDecimal(p.quote.yearsToMaturity, 1, locale),
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabular text-sm font-semibold">
                          {percent(p.netCagr, 2)}
                        </div>
                        <div className="tabular text-[11px] text-muted-foreground">
                          {t("scenarios.realShort", {
                            rate: percent(p.realNetCagr, 2),
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          p.quote.name.includes("140%")
                            ? "bg-violet-400"
                            : p.quote.family === "ipca"
                              ? "bg-emerald-400"
                              : p.quote.family === "prefixado"
                                ? "bg-amber-400"
                                : "bg-sky-400",
                        )}
                        style={{ width: `${Math.max(4, width)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("scenarios.cdbNote")}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{t("history.title")}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("history.intro", {
              fromRate: percent(race3?.ipca2035LockedReal, 2),
              toRate: percent(ipcaToday.buyRate, 2),
            })}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("history.columns.period")}</TableHead>
                <TableHead className="text-right">{t("history.columns.cdi")}</TableHead>
                <TableHead className="text-right">{t("history.columns.ipca")}</TableHead>
                <TableHead className="text-right">{t("history.columns.ipcaSold")}</TableHead>
                <TableHead className="text-right">{t("history.columns.ibovespa")}</TableHead>
                <TableHead className="text-right">{t("history.columns.lockedReal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {races.map((race) => (
                <TableRow key={race.years}>
                  <TableCell>
                    <div className="font-medium">
                      {t("history.period", { count: race.years })}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {shortDate(race.from, locale)} → {shortDate(race.to, locale)}
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right">{percent(race.cdiCagr)}</TableCell>
                  <TableCell className="tabular text-right">{percent(race.ipcaCagr)}</TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-medium",
                      toneForValue(race.ipca2035SoldCagr - race.cdiCagr),
                    )}
                  >
                    {percent(race.ipca2035SoldCagr)}
                  </TableCell>
                  <TableCell className={cn("tabular text-right", toneForValue(race.ibovCagr))}>
                    {percent(race.ibovCagr)}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {percent(race.ipca2035LockedReal, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("history.footer", {
            cdi: percent(race3?.cdiCagr),
            sold: percent(race3?.ipca2035SoldCagr),
          })}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">
            {t("chart.title", { rate: percent(ipcaToday.buyRate, 2) })}
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("chart.intro")}
          </p>
        </div>
        <div className="h-64 w-full rounded-xl border border-border/60 bg-card/40 p-3">
          <ResponsiveContainer width="100%" height={232}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="realRateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => monthYear(v, locale)}
                minTickGap={48}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[2, 9]}
                width={36}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as { date: string; rate: number };
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                      <div className="text-xs text-muted-foreground">
                        {shortDate(point.date, locale)}
                      </div>
                      <div className="tabular text-sm font-semibold">
                        {t("chart.tooltip", {
                          rate: formatDecimal(point.rate, 2, locale),
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={ipcaToday.buyRate * 100}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--chart-1)"
                strokeWidth={1.8}
                fill="url(#realRateFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{t("menu.title")}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t("menu.intro", { date: shortDate(tesouro.asOf, locale) })}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("menu.columns.title")}</TableHead>
                <TableHead className="text-right">{t("menu.columns.lockedRate")}</TableHead>
                <TableHead className="text-right">{t("menu.columns.impliedNominal")}</TableHead>
                <TableHead className="text-right">{t("menu.columns.netAfterTax")}</TableHead>
                <TableHead className="text-right">{t("menu.columns.realNet")}</TableHead>
                <TableHead className="text-right">{t("menu.columns.vsCdi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu.map((row) => (
                <TableRow key={`${row.family}-${row.maturity}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "hidden text-[10px] sm:inline-flex",
                          FAMILY_TONE[row.family],
                        )}
                      >
                        {tLib(`families.${row.family as TesouroFamily}`)}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("menu.meta", {
                        years: formatDecimal(row.yearsToMaturity, 1, locale),
                        tax: percent(row.taxRate, 1),
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {row.family === "ipca"
                      ? t("menu.ipcaPlus", { rate: percent(row.buyRate, 2) })
                      : row.family === "selic"
                        ? t("menu.selicPlus", { rate: percent(row.buyRate, 2) })
                        : percent(row.buyRate, 2)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {percent(row.impliedNominal, 1)}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {percent(row.netCagr, 1)}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {percent(row.realNetCagr, 1)}
                  </TableCell>
                  <TableCell className={cn("tabular text-right", toneForValue(row.vsCdiNet))}>
                    {signedPercent(row.vsCdiNet, 1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function VerdictCard({
  title,
  family,
  familyLabel,
  rate,
  rateHint,
  body,
}: {
  title: string;
  family: string;
  familyLabel: string;
  rate: string;
  rateHint: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <Badge variant="outline" className={cn("mb-3 text-[10px]", FAMILY_TONE[family])}>
        {familyLabel}
      </Badge>
      <div className="text-sm font-medium">{title}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{rate}</div>
      <div className="text-[11px] text-muted-foreground">{rateHint}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
