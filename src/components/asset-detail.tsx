"use client";

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

import type { AssetAnalysis } from "@/lib/analytics";
import { ELECTIONS } from "@/lib/elections";
import {
  marketCap,
  money,
  monthYear,
  percent,
  ratio,
  shortDate,
  signedPercent,
  toneForValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type PricePoint = { date: string; price: number };

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("tabular mt-0.5 text-base font-semibold", tone)}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PricePoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <div className="text-xs text-muted-foreground">{shortDate(point.date)}</div>
      <div className="tabular text-sm font-semibold">{money(point.price)}</div>
    </div>
  );
}

export function AssetDetail({
  asset,
  series,
  open,
  onOpenChange,
}: {
  asset: AssetAnalysis | null;
  series: PricePoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!asset) return null;

  const { price, performance, fundamentals, factors, rateSensitivity, electionSensitivity } = asset;
  const electionsInRange = ELECTIONS.filter(
    (e) => series.length > 0 && e.firstRound >= series[0].date,
  );

  const values = series.map((p) => p.price);
  const domainMin = Math.min(...values, price.min3y) * 0.96;
  const domainMax = Math.max(...values, price.max3y) * 1.04;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-2xl">{asset.ticker}</SheetTitle>
            <Badge variant="outline">{asset.sector}</Badge>
            <Badge variant="outline" className="capitalize">
              {asset.stateControl}
            </Badge>
            <Badge variant="outline" className="capitalize">
              receita {asset.revenueBase}
            </Badge>
          </div>
          <SheetDescription className="text-base text-foreground">
            {asset.name}
          </SheetDescription>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {asset.thesis}
          </p>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <div>
                <span className="tabular text-2xl font-semibold">{money(price.current)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  em {shortDate(asset.lastDate)}
                </span>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Mediana 3 anos: {money(price.median3y)}</div>
                <div className={toneForValue(-price.vsMedian)}>
                  {signedPercent(price.vsMedian, 1)} vs mediana
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={monthYear}
                    minTickGap={48}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[domainMin, domainMax]}
                    width={52}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    y={price.median3y}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{
                      value: "mediana",
                      position: "insideTopRight",
                      fill: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                  />
                  {electionsInRange.map((e) => (
                    <ReferenceLine
                      key={e.year}
                      x={series.find((p) => p.date >= e.firstRound)?.date}
                      stroke="var(--chart-3)"
                      strokeDasharray="3 3"
                      label={{
                        value: `eleição ${e.year}`,
                        position: "insideTopLeft",
                        fill: "var(--chart-3)",
                        fontSize: 10,
                      }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="var(--chart-1)"
                    strokeWidth={1.8}
                    fill="url(#priceFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risco e retorno · 3 anos
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric
                label="Retorno a.a."
                value={signedPercent(performance.cagr3y)}
                tone={toneForValue(performance.cagr3y)}
              />
              <Metric
                label="vs CDI"
                value={signedPercent(performance.excessOverCdi)}
                tone={toneForValue(performance.excessOverCdi)}
                hint="ao ano"
              />
              <Metric label="Volatilidade" value={percent(performance.volatility3y, 0)} />
              <Metric
                label="Sharpe"
                value={ratio(performance.sharpe3y)}
                tone={toneForValue(performance.sharpe3y)}
              />
              <Metric label="Sortino" value={ratio(performance.sortino3y)} />
              <Metric label="Beta" value={ratio(performance.beta3y)} hint="vs Ibovespa" />
              <Metric
                label="Correlação"
                value={ratio(performance.correlation3y)}
                hint="vs Ibovespa"
              />
              <Metric
                label="Queda máxima"
                value={percent(performance.maxDrawdown3y, 0)}
                tone="text-rose-400"
                hint={
                  performance.drawdownTrough
                    ? `fundo em ${shortDate(performance.drawdownTrough)}`
                    : undefined
                }
              />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fundamentos
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Valor de mercado" value={marketCap(fundamentals?.marketCap)} />
              <Metric label="P/L" value={ratio(fundamentals?.trailingPE, 1)} hint="12 meses" />
              <Metric label="P/L projetado" value={ratio(fundamentals?.forwardPE, 1)} />
              <Metric label="P/VP" value={ratio(fundamentals?.priceToBook)} />
              <Metric label="ROE" value={percent(fundamentals?.returnOnEquity, 1)} />
              <Metric label="Margem líquida" value={percent(fundamentals?.profitMargin, 1)} />
              <Metric
                label="Dividendos 12m"
                value={percent(asset.trailingDividendYield, 1)}
                hint="proventos pagos / preço"
              />
              <Metric
                label="Dívida/patrimônio"
                value={
                  fundamentals?.debtToEquity != null
                    ? `${fundamentals.debtToEquity.toFixed(0)}%`
                    : "—"
                }
              />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Exposição a fatores
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Ibovespa" value={ratio(factors.betas.ibov)} />
              <Metric
                label="Dólar"
                value={ratio(factors.betas.usdbrl)}
                tone={toneForValue(factors.betas.usdbrl)}
              />
              <Metric
                label="Brent"
                value={ratio(factors.betas.brent)}
                tone={toneForValue(factors.betas.brent)}
              />
              <Metric
                label="Treasury 10a"
                value={ratio(factors.betas.ust10y)}
                tone={toneForValue(factors.betas.ust10y)}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Dólar, Brent e Treasury entram descontados do efeito do Ibovespa, então
              medem o que sobra além do movimento do índice. O modelo explica{" "}
              {percent(factors.rSquared, 0)} da variação diária da ação em{" "}
              {factors.observations} pregões.
            </p>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sensibilidade política e a juros
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric
                label="Ratio eleitoral"
                value={ratio(electionSensitivity?.ratio)}
                hint="descolamento em eleição / normal"
                tone={
                  (electionSensitivity?.ratio ?? 0) >= 1.1 ? "text-amber-300" : undefined
                }
              />
              <Metric
                label="Selic +1 p.p."
                value={signedPercent(rateSensitivity.betaPerPoint, 1)}
                tone={
                  Math.abs(rateSensitivity.tStat ?? 0) < 2
                    ? "text-muted-foreground"
                    : toneForValue(rateSensitivity.betaPerPoint)
                }
                hint={
                  Math.abs(rateSensitivity.tStat ?? 0) < 2
                    ? "sinal estatisticamente fraco"
                    : `t = ${ratio(rateSensitivity.tStat, 1)}`
                }
              />
              <Metric
                label="Ciclo de alta"
                value={signedPercent(rateSensitivity.excessWhenHiking, 0)}
                tone={toneForValue(rateSensitivity.excessWhenHiking)}
                hint="excesso anualizado"
              />
              <Metric
                label="Ciclo de queda"
                value={signedPercent(rateSensitivity.excessWhenEasing, 0)}
                tone={toneForValue(rateSensitivity.excessWhenEasing)}
                hint="excesso anualizado"
              />
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Histórico eleitoral · retorno em excesso ao Ibovespa
            </h4>
            <div className="space-y-4">
              {asset.elections.map((election) => (
                <div key={election.year}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-sm font-medium">{election.year}</span>
                    <span className="text-xs text-muted-foreground">{election.winner}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {election.windows.map((w) => (
                      <div
                        key={w.windowId}
                        className="rounded-md border border-border/50 bg-card/40 px-2.5 py-1.5"
                      >
                        <div className="text-[10px] leading-tight text-muted-foreground">
                          {w.label}
                        </div>
                        <div
                          className={cn(
                            "tabular text-sm font-medium",
                            toneForValue(w.excess),
                          )}
                        >
                          {signedPercent(w.excess)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {asset.elections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sem histórico de pregões cobrindo eleições anteriores.
                </p>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
