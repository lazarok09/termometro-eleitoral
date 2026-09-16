"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import type { AssetAnalysis } from "@/lib/analytics";
import { percent, signedPercent, toneForValue } from "@/lib/format";
import { SCENARIOS, SHOCK_CONTROLS, projectScenario, type Shock } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CHANNEL_LABELS: Record<keyof Shock, string> = {
  ibov: "Mercado",
  selic: "Juros",
  usdbrl: "Câmbio",
  brent: "Petróleo",
  ust10y: "Juro externo",
};

const CHANNEL_COLORS: Record<keyof Shock, string> = {
  ibov: "bg-sky-400/80",
  selic: "bg-emerald-400/80",
  usdbrl: "bg-amber-400/80",
  brent: "bg-violet-400/80",
  ust10y: "bg-rose-400/80",
};

function formatShock(key: keyof Shock, value: number): string {
  if (key === "selic") return `${value > 0 ? "+" : ""}${value.toFixed(2)} p.p.`;
  return signedPercent(value, 0);
}

export function ScenarioSimulator({
  assets,
  cdiAnnualized,
  onSelect,
}: {
  assets: AssetAnalysis[];
  cdiAnnualized: number;
  onSelect: (ticker: string) => void;
}) {
  const [scenarioId, setScenarioId] = useState("promarket");
  const [shock, setShock] = useState<Shock>(
    () => SCENARIOS.find((s) => s.id === "promarket")!.shock,
  );

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const isCustom = scenario
    ? (Object.keys(shock) as (keyof Shock)[]).some(
        (k) => Math.abs(shock[k] - scenario.shock[k]) > 1e-9,
      )
    : true;

  const projections = useMemo(
    () => projectScenario(assets, shock, cdiAnnualized),
    [assets, shock, cdiAnnualized],
  );

  const cdiOverHorizon = (1 + cdiAnnualized) ** 0.5 - 1;
  const maxAbs = Math.max(...projections.map((p) => Math.abs(p.expected)), 0.05);

  function applyScenario(id: string) {
    const next = SCENARIOS.find((s) => s.id === id);
    if (!next) return;
    setScenarioId(id);
    setShock(next.shock);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Escolha um cenário</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada cenário é um conjunto de choques em um horizonte de 6 meses. Ajuste
            os controles para montar o seu.
          </p>
        </div>

        <div className="grid gap-2">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyScenario(item.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                scenarioId === item.id && !isCustom
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
              )}
            >
              <div className="text-sm font-medium">{item.name}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.summary}
              </div>
            </button>
          ))}
        </div>

        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Choques {isCustom && <span className="text-primary">(ajustado)</span>}
              </CardTitle>
              {isCustom && scenario && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setShock(scenario.shock)}
                >
                  <RotateCcw className="size-3" />
                  Restaurar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {SHOCK_CONTROLS.map((control) => (
              <div key={control.key}>
                <div className="flex items-baseline justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs font-medium">{control.label}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{control.help}</TooltipContent>
                  </Tooltip>
                  <span className="tabular text-sm font-medium">
                    {formatShock(control.key, shock[control.key])}
                  </span>
                </div>
                <Slider
                  className="mt-2"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={[shock[control.key]]}
                  onValueChange={([v]) => setShock((s) => ({ ...s, [control.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Retorno estimado em 6 meses</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Projeção construída a partir dos betas históricos de cada ação. É uma
              leitura de sensibilidade, não uma previsão: mostra como essas empresas
              costumaram reagir a choques parecidos.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              CDI no período
            </div>
            <div className="tabular text-base font-semibold">{percent(cdiOverHorizon)}</div>
          </div>
        </div>

        <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/40">
          {projections.map((p) => {
            const width = (Math.abs(p.expected) / maxAbs) * 50;
            const beatsCdi = p.vsCdi > 0;

            return (
              <button
                key={p.ticker}
                type="button"
                onClick={() => onSelect(p.ticker)}
                className="grid w-full grid-cols-[86px_1fr_92px] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
              >
                <div>
                  <div className="text-sm font-medium">{p.ticker}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.name}</div>
                </div>

                <div className="relative h-7">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className={cn(
                      "absolute top-1/2 flex h-4 -translate-y-1/2 overflow-hidden rounded-sm",
                      p.expected >= 0 ? "left-1/2" : "right-1/2 flex-row-reverse",
                    )}
                    style={{ width: `${width}%` }}
                  >
                    {(Object.keys(CHANNEL_LABELS) as (keyof Shock)[]).map((channel) => {
                      const contribution = p.contributions[channel];
                      if (Math.abs(contribution) < 1e-6) return null;
                      const share =
                        Math.abs(contribution) /
                        Object.values(p.contributions).reduce(
                          (acc, c) => acc + Math.abs(c),
                          0,
                        );
                      const aligned =
                        contribution >= 0 === p.expected >= 0;
                      return (
                        <Tooltip key={channel}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-full",
                                aligned ? CHANNEL_COLORS[channel] : "bg-muted",
                              )}
                              style={{ width: `${share * 100}%` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {CHANNEL_LABELS[channel]}: {signedPercent(contribution)}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <div className={cn("tabular text-sm font-semibold", toneForValue(p.expected))}>
                    {signedPercent(p.expected)}
                  </div>
                  <div
                    className={cn(
                      "tabular text-[11px]",
                      beatsCdi ? "text-emerald-400/70" : "text-muted-foreground",
                    )}
                  >
                    {signedPercent(p.vsCdi)} vs CDI
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span>Contribuição por canal:</span>
          {(Object.keys(CHANNEL_LABELS) as (keyof Shock)[]).map((channel) => (
            <span key={channel} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", CHANNEL_COLORS[channel])} />
              {CHANNEL_LABELS[channel]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted" />
            canal em sentido contrário
          </span>
        </div>
      </div>
    </div>
  );
}
