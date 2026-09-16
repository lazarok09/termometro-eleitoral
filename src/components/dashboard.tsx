"use client";

import { useState } from "react";
import { Banknote, BarChart3, LineChart, Sliders, Vote } from "lucide-react";

import type { AssetAnalysis, MacroContext } from "@/lib/analytics";
import type { CurrentMenuRow, HistoricalHorseRace } from "@/lib/fixed-income";
import { AssetDetail, type PricePoint } from "@/components/asset-detail";
import { ElectionStudy } from "@/components/election-study";
import { FixedIncomePanel } from "@/components/fixed-income";
import { PriceDistribution } from "@/components/price-distribution";
import { RankingTable } from "@/components/ranking-table";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "renda", label: "CDI vs IPCA+", icon: Banknote },
  { id: "ranking", label: "Ranking", icon: BarChart3 },
  { id: "cenarios", label: "Cenários", icon: Sliders },
  { id: "eleicoes", label: "Eleições passadas", icon: Vote },
  { id: "preco", label: "Preço típico", icon: LineChart },
];

export function Dashboard({
  assets,
  series,
  macro,
  races,
  menu,
}: {
  assets: AssetAnalysis[];
  series: Record<string, PricePoint[]>;
  macro: MacroContext;
  races: HistoricalHorseRace[];
  menu: CurrentMenuRow[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedAsset = selected ? (assets.find((a) => a.ticker === selected) ?? null) : null;

  return (
    <>
      <Tabs defaultValue="ranking" className="w-full gap-6">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2 px-3 py-2">
              <tab.icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="renda">
          <FixedIncomePanel macro={macro} races={races} menu={menu} />
        </TabsContent>

        <TabsContent value="ranking">
          <RankingTable assets={assets} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="cenarios">
          <ScenarioSimulator
            assets={assets}
            cdiAnnualized={macro.cdiAnnualized}
            onSelect={setSelected}
          />
        </TabsContent>

        <TabsContent value="eleicoes">
          <ElectionStudy assets={assets} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="preco">
          <PriceDistribution assets={assets} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <AssetDetail
        asset={selectedAsset}
        series={selectedAsset ? (series[selectedAsset.ticker] ?? []) : []}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
