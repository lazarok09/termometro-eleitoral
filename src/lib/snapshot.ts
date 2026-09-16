import snapshotJson from "../../data/market-snapshot.json";

export type PriceHistory = {
  symbol: string;
  currency: string | null;
  longName: string | null;
  lastPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** Datas de pregão em ordem crescente, "YYYY-MM-DD". */
  dates: string[];
  /** Fechamentos ajustados por proventos e desdobramentos. */
  closes: number[];
  /** Fechamentos nominais, como aparecem no home broker. */
  prices: number[];
  dividends: { date: string; amount: number }[];
};

export type Fundamentals = {
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  ebitda: number | null;
};

export type MacroPoint = { date: string; value: number };

export type MarketSnapshot = {
  generatedAt: string;
  source: { prices: string; macro: string };
  series: Record<string, PriceHistory>;
  fundamentals: Record<string, Fundamentals>;
  macro: {
    cdiDaily: MacroPoint[];
    selicTarget: MacroPoint[];
    ipcaMonthly: MacroPoint[];
  };
};

export const snapshot = snapshotJson as unknown as MarketSnapshot;
