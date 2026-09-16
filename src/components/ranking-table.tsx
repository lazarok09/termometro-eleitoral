"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Banana, ChevronsUpDown, Landmark, Zap } from "lucide-react";

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

const SECTOR_FILTERS: { id: SectorFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "bancos", label: "Bancos" },
  { id: "energia", label: "Energia" },
  { id: "baratas", label: "P/VP < 1" },
];

function isBanana(a: AssetAnalysis): boolean {
  const pb = num(a.fundamentals?.priceToBook);
  return pb != null && pb < 1;
}

type ViewId = "risco" | "valuation" | "politica";

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

const VIEWS: { id: ViewId; label: string; description: string }[] = [
  {
    id: "risco",
    label: "Risco e retorno",
    description:
      "Como cada ação se comportou nos últimos 3 anos, sempre comparada ao CDI — que é a alternativa real de quem investe no Brasil.",
  },
  {
    id: "valuation",
    label: "Preço e fundamentos",
    description:
      "O que você paga por cada ação: múltiplos, dividendos e a distância entre o preço de hoje e a mediana dos últimos 3 anos.",
  },
  {
    id: "politica",
    label: "Política e juros",
    description:
      "Quanto cada ação se descola do Ibovespa em temporada eleitoral e como reage historicamente a movimentos da Selic.",
  },
];

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

const COLUMNS: Record<ViewId, Column[]> = {
  risco: [
    {
      id: "cagr3y",
      label: "Retorno a.a. (3a)",
      help: "Retorno total anualizado dos últimos 3 anos, já incluindo dividendos reinvestidos.",
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
      label: "vs CDI",
      help: "Quanto a ação rendeu a mais (ou a menos) que o CDI no mesmo período, ao ano. Negativo significa que a renda fixa teria sido melhor.",
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
      label: "Volatilidade",
      help: "Desvio padrão anualizado dos retornos diários. Quanto maior, mais o preço oscila.",
      value: (a) => num(a.performance.volatility3y),
      render: (a) => <span className="tabular">{percent(a.performance.volatility3y, 0)}</span>,
    },
    {
      id: "sharpe",
      label: "Sharpe",
      help: "Retorno acima do CDI dividido pela volatilidade. Mede quanto de retorno extra você recebeu por unidade de risco. Negativo: você correu risco e perdeu para a renda fixa.",
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
      label: "Beta",
      help: "Sensibilidade ao Ibovespa. Beta 1,5 significa que a ação tende a subir ou cair 1,5% quando o índice move 1%.",
      value: (a) => num(a.performance.beta3y),
      render: (a) => <span className="tabular">{ratio(a.performance.beta3y)}</span>,
    },
    {
      id: "dd",
      label: "Queda máxima",
      help: "A maior queda do topo ao fundo dentro dos últimos 3 anos. É o tamanho da dor que o histórico já entregou.",
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
      label: "vs mediana 3a",
      help: "O preço de hoje comparado à mediana dos últimos 3 anos — o 'preço típico'. O marcador mostra em que ponto da distribuição histórica a ação está.",
      value: (a) => num(a.price.vsMedian),
      render: (a) => <PricePositionCell asset={a} />,
    },
    {
      id: "vsHigh",
      label: "vs máxima 52s",
      help: "Distância até a máxima dos últimos 12 meses.",
      value: (a) => num(a.price.vsHigh52w),
      render: (a) => (
        <span className="tabular text-muted-foreground">{signedPercent(a.price.vsHigh52w, 0)}</span>
      ),
      highIsFirst: true,
    },
    {
      id: "pe",
      label: "P/L",
      help: "Preço dividido pelo lucro dos últimos 12 meses. Quantos anos de lucro atual você paga pela empresa.",
      value: (a) => num(a.fundamentals?.trailingPE),
      render: (a) => <span className="tabular">{ratio(a.fundamentals?.trailingPE, 1)}</span>,
    },
    {
      id: "pb",
      label: "P/VP",
      help: "Preço sobre valor patrimonial. Abaixo de 1 significa que o mercado paga menos do que o patrimônio contábil da empresa.",
      value: (a) => num(a.fundamentals?.priceToBook),
      render: (a) => (
        <span className={cn("tabular", (a.fundamentals?.priceToBook ?? 9) < 1 && "text-emerald-400")}>
          {ratio(a.fundamentals?.priceToBook)}
        </span>
      ),
    },
    {
      id: "dy",
      label: "Dividendos 12m",
      help: "Proventos pagos nos últimos 12 meses sobre o preço atual. Compare com o CDI antes de chamar de 'renda'.",
      value: (a) => num(a.trailingDividendYield),
      render: (a) => (
        <span className="tabular">{percent(a.trailingDividendYield, 1)}</span>
      ),
      highIsFirst: true,
    },
    {
      id: "roe",
      label: "ROE",
      help: "Retorno sobre o patrimônio líquido: quanto de lucro a empresa gera sobre o capital dos acionistas.",
      value: (a) => num(a.fundamentals?.returnOnEquity),
      render: (a) => <span className="tabular">{percent(a.fundamentals?.returnOnEquity, 0)}</span>,
      highIsFirst: true,
    },
  ],
  politica: [
    {
      id: "electionSensitivity",
      label: "Sensibilidade eleitoral",
      help: "Quanto a ação se descola do Ibovespa em temporada eleitoral, dividido pelo quanto ela se descola no resto do tempo. Acima de 1,00: a eleição realmente mexe com essa ação além do que mexe com o índice.",
      value: (a) => num(a.electionSensitivity?.ratio),
      render: (a) => <SensitivityBar ratio={num(a.electionSensitivity?.ratio)} />,
      highIsFirst: true,
    },
    {
      id: "selicBeta",
      label: "Efeito Selic +1 p.p.",
      help: "Retorno em excesso ao Ibovespa, historicamente associado a cada ponto percentual de alta da Selic. Valores negativos indicam ações que sofrem com juros subindo e se beneficiam de cortes.",
      value: (a) => num(a.rateSensitivity.betaPerPoint),
      render: (a) => {
        const beta = num(a.rateSensitivity.betaPerPoint);
        const weak = Math.abs(num(a.rateSensitivity.tStat) ?? 0) < 2;
        return (
          <span className={cn("tabular", weak ? "text-muted-foreground" : toneForValue(beta))}>
            {signedPercent(beta, 1)}
            {weak && <span className="ml-1 text-[10px]">fraco</span>}
          </span>
        );
      },
    },
    {
      id: "hiking",
      label: "Em ciclo de alta",
      help: "Retorno anualizado em excesso ao Ibovespa durante períodos em que a Selic estava subindo.",
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
      label: "Em ciclo de queda",
      help: "Retorno anualizado em excesso ao Ibovespa durante períodos em que a Selic estava caindo.",
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
      label: "Beta dólar",
      help: "Efeito de uma alta do dólar sobre a ação, já descontado o que o Ibovespa explica. Positivo indica proteção cambial.",
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
      label: "Beta petróleo",
      help: "Efeito de uma alta do Brent sobre a ação, já descontado o que o Ibovespa explica.",
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

const STATE_STYLES: Record<string, string> = {
  estatal: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "ex-estatal": "border-orange-400/30 bg-orange-400/10 text-orange-300",
  regulada: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  privada: "border-border bg-muted/40 text-muted-foreground",
};

export function RankingTable({
  assets,
  onSelect,
}: {
  assets: AssetAnalysis[];
  onSelect: (ticker: string) => void;
}) {
  const [view, setView] = useState<ViewId>("risco");
  const [sortId, setSortId] = useState<string>("sharpe");
  const [descending, setDescending] = useState(true);
  const [onlyStateLinked, setOnlyStateLinked] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>("todas");

  const columns = COLUMNS[view];
  const activeView = VIEWS.find((v) => v.id === view)!;

  function changeView(next: ViewId) {
    setView(next);
    const first = COLUMNS[next][0];
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
          {VIEWS.map((v) => (
            <ToggleGroupItem key={v.id} value={v.id} className="px-3 text-xs sm:text-sm">
              {v.label}
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
          Só empresas com Estado no controle
        </Button>
        </div>

        <ToggleGroup
          type="single"
          value={sectorFilter}
          onValueChange={(v) => v && changeSector(v as SectorFilter)}
          variant="outline"
          className="w-full justify-start sm:w-auto"
        >
          {SECTOR_FILTERS.map((f) => (
            <ToggleGroupItem key={f.id} value={f.id} className="px-3 text-xs sm:text-sm">
              {f.id === "energia" ? <Zap className="size-3.5" /> : null}
              {f.id === "baratas" ? <Banana className="size-3.5" /> : null}
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <p className="text-sm text-muted-foreground">
        {sectorFilter === "bancos" &&
          "Ordenado por P/VP. Abaixo de 1 o mercado paga menos que o patrimônio — o desconto do Banco do Brasil e dos regionais é estrutural, não um erro de preço automático. "}
        {sectorFilter === "energia" &&
          "Elétricas listadas: geração, transmissão e distribuição. P/VP baixo aparece na transmissão (ISA, Alupar) e na Cemig; Equatorial e Eneva pagam múltiplo de crescimento. "}
        {sectorFilter === "baratas" &&
          "Só quem negocia abaixo do valor patrimonial. Compare com a mediana de 3 anos: múltiplo baixo depois de um rali ainda é caro contra o próprio histórico. "}
        {activeView.description}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card/95 backdrop-blur">
                Empresa
              </TableHead>
              <TableHead className="text-right">Preço</TableHead>
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
                          P/VP {ratio(asset.fundamentals?.priceToBook)} — abaixo do patrimônio
                          contábil. Isso é desconto, não garantia de alta.
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("hidden text-[10px] sm:inline-flex", STATE_STYLES[asset.stateControl])}
                    >
                      {asset.stateControl}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{asset.name}</div>
                </TableCell>
                <TableCell className="tabular text-right">{money(asset.price.current)}</TableCell>
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

      <p className="text-xs text-muted-foreground">
        Clique em qualquer linha para abrir a análise completa da empresa. Passe o
        mouse sobre o nome da coluna para ver como a métrica é calculada.
      </p>
    </div>
  );
}
