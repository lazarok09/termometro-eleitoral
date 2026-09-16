"use client";

import { useMemo, useState } from "react";
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
  familyLabel,
  projectHorizon,
  tesouro,
  type CurrentMenuRow,
  type HistoricalHorseRace,
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
  { id: "3", years: 3, label: "3 anos" },
  { id: "5", years: 5, label: "5 anos" },
  { id: "9", years: 9, label: "9 anos" },
];

const FAMILY_TONE: Record<string, string> = {
  selic: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  ipca: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  prefixado: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export function FixedIncomePanel({
  macro,
  races,
  menu,
}: {
  macro: MacroContext;
  races: HistoricalHorseRace[];
  menu: CurrentMenuRow[];
}) {
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
          Resposta direta
        </Badge>
        <h3 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
          Não automaticamente. Travar IPCA+ hoje protege contra inflação, não contra a
          Selic cair.
        </h3>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          O Tesouro IPCA+ 2029 paga IPCA + {percent(quotes.ipcaShort.buyRate, 2)} reais.
          Com o IPCA dos últimos 12 meses em {percent(macro.ipca12m, 2)}, isso vira cerca
          de {percent((1 + macro.ipca12m) * (1 + quotes.ipcaShort.buyRate) - 1, 1)} ao
          ano — menos que o CDI a {percent(macro.cdiAnnualized, 2)}. O prefixado 2029, a{" "}
          {percent(quotes.prefixShort.buyRate, 2)}, só perde para o IPCA+ se a inflação
          média até 2029 ficar acima de {percent(breakeven, 1)}. Abaixo disso, quem
          trava o prefixado hoje leva mais.
        </p>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
          O IPCA+ deixa de ser “40% de nada” quando a Selic cai: o juro real de{" "}
          {percent(quotes.ipcaMid.buyRate, 2)} continua travado. O CDI, não. Mas se a
          Selic cair <em>porque</em> a inflação foi controlada, o prefixado — não o
          IPCA+ — é o contrato que mais ganha com a compra feita agora.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <VerdictCard
          title="Tesouro Selic / CDB"
          family="selic"
          rate={percent(macro.cdiAnnualized, 2)}
          rateHint="flutua com o Copom"
          body="Paga enquanto a Selic estiver alta. No dia em que o juro cair, o rendimento cai junto. É o único que não toma tombo de marcação a mercado se você precisar do dinheiro amanhã."
        />
        <VerdictCard
          title="Tesouro Prefixado"
          family="prefixado"
          rate={percent(quotes.prefixMid.buyRate, 2)}
          rateHint={`${quotes.prefixMid.name.replace("Tesouro Prefixado ", "venc. ")} travado`}
          body="Ganha se a inflação cooperar e a Selic cair. É a aposta na âncora fiscal: o Brasil conquista a inflação e você ficou com 14% no contrato."
        />
        <VerdictCard
          title="Tesouro IPCA+"
          family="ipca"
          rate={`IPCA + ${percent(quotes.ipcaMid.buyRate, 2)}`}
          rateHint={`${quotes.ipcaMid.name.replace("Tesouro IPCA+ ", "venc. ")} travado`}
          body="Ganha se a inflação surpreender. O juro real de hoje é alto em termos históricos — travar agora faz sentido para quem consegue carregar até o vencimento."
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">E se a Selic e o IPCA forem outros?</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Os quatro cenários abaixo reprecificam os títulos que você compraria hoje,
            carregados até o vencimento, com IR regressivo. Nada aqui é marcação a
            mercado: assume que você não vende no meio do caminho.
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
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {preset.summary}
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Hipótese daqui pra frente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-medium">Horizonte</div>
                <ToggleGroup
                  type="single"
                  value={horizonId}
                  onValueChange={(v) => v && setHorizonId(v)}
                  variant="outline"
                  className="w-full"
                >
                  {HORIZONS.map((h) => (
                    <ToggleGroupItem key={h.id} value={h.id} className="flex-1">
                      {h.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">Selic média</span>
                  <span className="tabular text-sm font-semibold">
                    {selicPct.toFixed(2)}%
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
                  <span className="text-xs font-medium">IPCA médio</span>
                  <span className="tabular text-sm font-semibold">
                    {ipcaPct.toFixed(1)}%
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
                  Inflação de equilíbrio do prefixado 2029 vs IPCA+ 2029:{" "}
                  {percent(breakeven, 1)}. Acima disso o IPCA+ vence o prefixado.
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
                Melhor líquido após IR neste cenário
              </div>
              <div className="mt-1 text-lg font-semibold">{projection.winner.quote.name}</div>
              <div className="tabular text-sm text-muted-foreground">
                {percent(projection.winner.netCagr, 2)} ao ano líquido ·{" "}
                {percent(projection.winner.realNetCagr, 2)} reais após inflação
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
                          <span className="text-sm font-medium">{p.quote.name}</span>
                          {p.quote.family !== "selic" && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", FAMILY_TONE[p.quote.family])}
                            >
                              {familyLabel(p.quote.family)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          bruto {percent(p.grossCagr, 1)} · IR{" "}
                          {percent(p.taxRate, 1)} · vencimento em{" "}
                          {p.quote.yearsToMaturity.toFixed(1).replace(".", ",")} anos
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tabular text-sm font-semibold">
                          {percent(p.netCagr, 2)}
                        </div>
                        <div className="tabular text-[11px] text-muted-foreground">
                          real {percent(p.realNetCagr, 2)}
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
              A linha violeta é um CDB 140% do CDI — o produto da conversa original.
              Aparece em bancos médios, com prazo travado e teto do FGC. Não entra na
              escolha do vencedor porque não é comparável ao Tesouro em liquidez nem
              em disponibilidade.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">O que o IPCA+ 2035 realmente rendeu</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Comprar IPCA+ não é o mesmo que carregar até o vencimento. A tabela abaixo
            usa o preço de mercado do Tesouro IPCA+ 2035: é o retorno de quem vendeu
            no meio do caminho. Nos últimos 3 anos o juro real saiu de{" "}
            {percent(races.find((r) => r.years === 3)?.ipca2035LockedReal, 2)} para{" "}
            {percent(ipcaToday.buyRate, 2)}, e a marcação a mercado comeu o cupom.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Período</TableHead>
                <TableHead className="text-right">CDI</TableHead>
                <TableHead className="text-right">IPCA</TableHead>
                <TableHead className="text-right">IPCA+ 2035 vendido</TableHead>
                <TableHead className="text-right">Ibovespa</TableHead>
                <TableHead className="text-right">Juro real na compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {races.map((race) => (
                <TableRow key={race.years}>
                  <TableCell>
                    <div className="font-medium">{race.years} {race.years === 1 ? "ano" : "anos"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {shortDate(race.from)} → {shortDate(race.to)}
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
          Em 3 anos o CDI fez {percent(races.find((r) => r.years === 3)?.cdiCagr)} ao
          ano. Quem comprou o IPCA+ 2035 e vendeu agora fez{" "}
          {percent(races.find((r) => r.years === 3)?.ipca2035SoldCagr)} — perdeu para a
          renda fixa fluida e para a Bolsa. Quem carregar até 2035 ainda recebe o juro
          real contratado na compra. A diferença entre as duas frases é o prazo.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">
            Juro real do Tesouro IPCA+ 2035 · {percent(ipcaToday.buyRate, 2)} hoje
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Cada ponto deste gráfico é a taxa real que o Tesouro estava disposto a
            travar naquele dia. Comprar IPCA+ em 2019, a 3,4%, foi travar barato.
            Comprar agora, perto de 7,5%, é travar caro para o Tesouro e barato para
            você — desde que consiga não vender se o juro real for a 8,5%.
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
                tickFormatter={monthYear}
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
                      <div className="text-xs text-muted-foreground">{shortDate(point.date)}</div>
                      <div className="tabular text-sm font-semibold">
                        IPCA + {point.rate.toFixed(2).replace(".", ",")}%
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
          <h3 className="text-sm font-medium">Cardápio vigente do Tesouro Direto</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Taxas de compra da manhã de {shortDate(tesouro.asOf)}. O nominal implícito
            do IPCA+ usa o IPCA dos últimos 12 meses só como ilustração — a inflação
            futura é o que vai decidir. Selic aparece quase igual ao CDI porque o ágio
            desses títulos está perto de zero.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead className="text-right">Taxa travada</TableHead>
                <TableHead className="text-right">Nominal implícito</TableHead>
                <TableHead className="text-right">Líquido após IR</TableHead>
                <TableHead className="text-right">Real líquido</TableHead>
                <TableHead className="text-right">vs CDI líquido</TableHead>
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
                        className={cn("hidden text-[10px] sm:inline-flex", FAMILY_TONE[row.family])}
                      >
                        {familyLabel(row.family)}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.yearsToMaturity.toFixed(1).replace(".", ",")} anos · IR{" "}
                      {percent(row.taxRate, 1)}
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {row.family === "ipca"
                      ? `IPCA + ${percent(row.buyRate, 2)}`
                      : row.family === "selic"
                        ? `Selic + ${percent(row.buyRate, 2)}`
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
  rate,
  rateHint,
  body,
}: {
  title: string;
  family: string;
  rate: string;
  rateHint: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <Badge variant="outline" className={cn("mb-3 text-[10px]", FAMILY_TONE[family])}>
        {familyLabel(family as "selic" | "ipca" | "prefixado")}
      </Badge>
      <div className="text-sm font-medium">{title}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{rate}</div>
      <div className="text-[11px] text-muted-foreground">{rateHint}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
