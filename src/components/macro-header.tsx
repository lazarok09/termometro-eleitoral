"use client";

import { CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { MacroContext } from "@/lib/analytics";
import { NEXT_ELECTION } from "@/lib/elections";
import { tesouro } from "@/lib/fixed-income";
import { formatInteger, percent, shortDate, signedPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

function daysUntil(iso: string, from: string): number {
  const target = Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  );
  const start = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  return Math.round((target - start) / 86_400_000);
}

type Stat = { label: string; value: string; hint: string };

export function MacroHeader({ macro }: { macro: MacroContext }) {
  const t = useTranslations("MacroHeader");
  const locale = useLocale();
  const days = daysUntil(NEXT_ELECTION.firstRound, macro.lastDate);

  const stats: Stat[] = [
    {
      label: t("stats.selic.label"),
      value: percent(macro.selicTarget / 100, 2),
      hint: t("stats.selic.hint"),
    },
    {
      label: t("stats.cdi.label"),
      value: percent(macro.cdiAnnualized, 2),
      hint: t("stats.cdi.hint"),
    },
    {
      label: t("stats.ipca12m.label"),
      value: percent(macro.ipca12m, 2),
      hint: t("stats.ipca12m.hint"),
    },
    {
      label: t("stats.realRate.label"),
      value: percent(macro.realRate, 2),
      hint: t("stats.realRate.hint"),
    },
    {
      label: t("stats.ipca2035.label"),
      value: t("ipcaPlus", {
        rate: percent(tesouro.ipca2035[tesouro.ipca2035.length - 1]?.buyRate, 2),
      }),
      hint: t("stats.ipca2035.hint"),
    },
    {
      label: t("stats.ibovespa.label"),
      value: formatInteger(macro.ibovLevel, locale),
      hint: t("stats.ibovespa.hint", { return: signedPercent(macro.ibovReturn1y) }),
    },
    {
      label: t("stats.usd.label"),
      value: `R$ ${macro.usdbrl.toFixed(2)}`,
      hint: t("stats.usd.hint"),
    },
    {
      label: t("stats.brent.label"),
      value: `US$ ${macro.brent.toFixed(2)}`,
      hint: t("stats.brent.hint"),
    },
  ];

  return (
    <header className="grid-backdrop border-b border-border/60">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              {t("dataAsOf", { date: shortDate(macro.lastDate, locale) })}
            </Badge>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("description")}
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-primary/25 bg-card/60 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t("firstRound")}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular text-3xl font-semibold text-primary">{days}</span>
              <span className="text-sm text-muted-foreground">{t("days")}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("runoff", {
                firstRound: shortDate(NEXT_ELECTION.firstRound, locale),
                runoff: shortDate(NEXT_ELECTION.runoff, locale),
              })}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-4 xl:grid-cols-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card/80 px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="tabular mt-1 text-lg font-semibold">{stat.value}</dd>
              <dd className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {stat.hint}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
