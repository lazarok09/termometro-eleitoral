#!/usr/bin/env node
/**
 * Baixa o histórico usado pelo painel e grava data/market-snapshot.json.
 *
 * Fontes:
 *  - Yahoo Finance: preços diários ajustados, dividendos e múltiplos.
 *  - SGS/Banco Central: CDI diário (série 12), Selic meta (432) e IPCA (433).
 *
 * O snapshot é versionado no repositório para que o app rode sem rede.
 * Rode `npm run fetch-data` para atualizar.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "data", "market-snapshot.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/** Início da série. Cobre as eleições de 2014, 2018 e 2022. */
const HISTORY_START = Date.UTC(2013, 0, 1) / 1000;

const SYMBOLS = [
  "PETR4.SA",
  "BBAS3.SA",
  "CMIG4.SA",
  "AXIA3.SA",
  "CPLE3.SA",
  "EQTL3.SA",
  "ENGI11.SA",
  "CPFE3.SA",
  "EGIE3.SA",
  "ENEV3.SA",
  "ALUP11.SA",
  "ISAE4.SA",
  "AURE3.SA",
  "SBSP3.SA",
  "B3SA3.SA",
  "ITUB4.SA",
  "BBDC4.SA",
  "SANB11.SA",
  "BRSR6.SA",
  "ABCB4.SA",
  "BMGB4.SA",
  "BPAC11.SA",
  "VALE3.SA",
  "GGBR4.SA",
  "WEGE3.SA",
  "EMBJ3.SA",
  "SUZB3.SA",
  "PRIO3.SA",
  "TAEE11.SA",
  "VIVT3.SA",
  "ABEV3.SA",
  "RADL3.SA",
  "LREN3.SA",
  "RENT3.SA",
  "^BVSP",
  "USDBRL=X",
  "BZ=F",
  "^TNX",
];

let cachedCrumb = null;
let cachedCookie = "";

async function getCrumb() {
  if (cachedCrumb) return cachedCrumb;

  const seed = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
  const setCookie = seed.headers.getSetCookie?.() ?? [];
  cachedCookie = setCookie.map((c) => c.split(";")[0]).join("; ");

  const res = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cachedCookie },
  });
  const crumb = (await res.text()).trim();
  if (!crumb || crumb.includes("<")) throw new Error("não consegui obter o crumb do Yahoo");
  cachedCrumb = crumb;
  return crumb;
}

async function fetchJson(url, withAuth = false) {
  const headers = { "User-Agent": UA };
  if (withAuth) {
    await getCrumb();
    headers.Cookie = cachedCookie;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.json();
}

/** Converte epoch em segundos para "YYYY-MM-DD" no fuso de Brasília. */
function toBrDate(epochSeconds) {
  return new Date((epochSeconds - 3 * 3600) * 1000).toISOString().slice(0, 10);
}

async function fetchHistory(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${HISTORY_START}&period2=${now}&interval=1d&events=div%7Csplit`;

  const json = await fetchJson(url);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`sem dados para ${symbol}`);

  const stamps = result.timestamp ?? [];
  const adj = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const raw = result.indicators?.quote?.[0]?.close ?? [];
  const volume = result.indicators?.quote?.[0]?.volume ?? [];

  const dates = [];
  const closes = [];
  const prices = [];
  const seen = new Set();

  for (let i = 0; i < stamps.length; i++) {
    const adjusted = adj[i] ?? raw[i];
    const nominal = raw[i] ?? adj[i];
    if (adjusted == null || nominal == null) continue;
    if (!Number.isFinite(adjusted) || adjusted <= 0) continue;
    // Feriados e leilões às vezes voltam com volume zero e preço repetido.
    if (volume[i] === 0 && i > 0 && raw[i] === raw[i - 1]) continue;

    const date = toBrDate(stamps[i]);
    if (seen.has(date)) continue;
    seen.add(date);

    dates.push(date);
    closes.push(Number(adjusted.toFixed(4)));
    prices.push(Number(nominal.toFixed(2)));
  }

  const dividends = Object.values(result.events?.dividends ?? {})
    .map((d) => ({ date: toBrDate(d.date), amount: Number(d.amount) }))
    .filter((d) => Number.isFinite(d.amount) && d.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    symbol,
    currency: result.meta?.currency ?? null,
    longName: result.meta?.longName ?? result.meta?.shortName ?? null,
    lastPrice: result.meta?.regularMarketPrice ?? prices.at(-1) ?? null,
    fiftyTwoWeekHigh: result.meta?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: result.meta?.fiftyTwoWeekLow ?? null,
    dates,
    closes,
    prices,
    dividends,
  };
}

async function fetchFundamentals(symbol) {
  const crumb = await getCrumb();
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(crumb)}`;

  try {
    const json = await fetchJson(url, true);
    const r = json?.quoteSummary?.result?.[0];
    if (!r) return null;
    const pick = (v) => (typeof v?.raw === "number" && Number.isFinite(v.raw) ? v.raw : null);
    return {
      marketCap: pick(r.summaryDetail?.marketCap),
      trailingPE: pick(r.summaryDetail?.trailingPE),
      forwardPE: pick(r.summaryDetail?.forwardPE),
      priceToBook: pick(r.defaultKeyStatistics?.priceToBook),
      dividendYield: pick(r.summaryDetail?.dividendYield),
      payoutRatio: pick(r.summaryDetail?.payoutRatio),
      debtToEquity: pick(r.financialData?.debtToEquity),
      returnOnEquity: pick(r.financialData?.returnOnEquity),
      profitMargin: pick(r.financialData?.profitMargins),
      revenueGrowth: pick(r.financialData?.revenueGrowth),
      earningsGrowth: pick(r.financialData?.earningsGrowth),
      totalCash: pick(r.financialData?.totalCash),
      totalDebt: pick(r.financialData?.totalDebt),
      ebitda: pick(r.financialData?.ebitda),
    };
  } catch (err) {
    console.warn(`  ! fundamentos indisponíveis para ${symbol}: ${err.message}`);
    return null;
  }
}

function brDate(year, month, day) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

async function fetchBcbChunk(id, from, to) {
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json` +
    `&dataInicial=${from}&dataFinal=${to}`;
  // O SGS responde 406 sem um Accept explícito e também quando a janela
  // pedida é longa demais para uma série diária.
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} na série ${id} (${from}–${to})`);
  const body = await res.text();
  if (!body.trim()) return [];
  return JSON.parse(body);
}

/** Busca a série ano a ano: o SGS recusa janelas longas em séries diárias. */
async function fetchBcbSeries(id, startYear) {
  const endYear = new Date().getFullYear();
  const rows = [];
  for (let year = startYear; year <= endYear; year++) {
    const chunk = await fetchBcbChunk(id, brDate(year, 1, 1), brDate(year, 12, 31));
    rows.push(...chunk);
  }
  return rows
    .map((row) => {
      const [d, m, y] = row.data.split("/");
      return { date: `${y}-${m}-${d}`, value: Number(row.valor) };
    })
    .filter((row) => Number.isFinite(row.value));
}

async function main() {
  const merge = process.argv.includes("--merge");
  let existing = { series: {}, fundamentals: {}, macro: null, source: null };
  if (merge) {
    try {
      const { readFile } = await import("node:fs/promises");
      existing = JSON.parse(await readFile(OUT_FILE, "utf8"));
      console.log(`Reusando snapshot de ${existing.generatedAt ?? "data anterior"}`);
    } catch {
      console.log("Snapshot anterior ausente; baixando tudo.");
    }
  }

  console.log(`Baixando ${SYMBOLS.length} séries do Yahoo Finance...`);

  const series = { ...(existing.series ?? {}) };
  const fundamentals = { ...(existing.fundamentals ?? {}) };

  for (const symbol of SYMBOLS) {
    if (merge && series[symbol]?.dates?.length > 200 && (!symbol.endsWith(".SA") || fundamentals[symbol])) {
      console.log(`  ${symbol.padEnd(12)} (já no disco, ${series[symbol].dates.length} pregões)`);
      continue;
    }
    process.stdout.write(`  ${symbol.padEnd(12)}`);
    const history = await fetchHistory(symbol);
    series[symbol] = history;
    console.log(`${history.dates.length} pregões (${history.dates[0]} → ${history.dates.at(-1)})`);

    if (symbol.endsWith(".SA")) {
      const f = await fetchFundamentals(symbol);
      if (f) fundamentals[symbol] = f;
    }
  }

  let cdiDaily, selicTarget, ipcaMonthly, source;
  if (merge && existing.macro?.cdiDaily?.length) {
    ({ cdiDaily, selicTarget, ipcaMonthly } = existing.macro);
    source = existing.source;
    console.log("Macro do Banco Central reaproveitada do snapshot.");
  } else {
    console.log("Baixando séries do Banco Central (CDI, Selic, IPCA)...");
    cdiDaily = await fetchBcbSeries(12, 2013);
    selicTarget = await fetchBcbSeries(432, 2013);
    ipcaMonthly = await fetchBcbSeries(433, 2013);
    console.log(`  CDI: ${cdiDaily.length} dias | Selic: ${selicTarget.length} | IPCA: ${ipcaMonthly.length} meses`);
    source = {
      prices: "Yahoo Finance (fechamentos ajustados por proventos e desdobramentos)",
      macro: "Banco Central do Brasil — SGS séries 12 (CDI), 432 (Selic meta) e 433 (IPCA)",
    };
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source,
    series,
    fundamentals,
    macro: {
      cdiDaily,
      selicTarget,
      ipcaMonthly,
    },
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot));

  const { size } = await import("node:fs").then((fs) => fs.promises.stat(OUT_FILE));
  console.log(`\nSnapshot salvo em data/market-snapshot.json (${(size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error("\nFalha ao baixar os dados:", err.message);
  process.exit(1);
});
