#!/usr/bin/env node
/**
 * Baixa o CSV oficial de taxas do Tesouro Direto e grava um recorte
 * em data/tesouro.json — só as cotações vigentes e a série mensal do
 * Tesouro IPCA+ 2035, que existe desde 2010 e serve de termômetro do juro real.
 *
 * Fonte: Tesouro Transparente / CKAN
 * https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "data", "tesouro.json");

const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

const FAMILIES = {
  "Tesouro Selic": "selic",
  "Tesouro IPCA+": "ipca",
  "Tesouro Prefixado": "prefixado",
};

const IPCA_2035_MATURITY = "15/05/2035";

function parseBrNumber(value) {
  const s = (value ?? "").trim();
  if (!s) return null;
  return Number(s.replace(",", "."));
}

function toIso(brDate) {
  const [d, m, y] = brDate.split("/");
  return `${y}-${m}-${d}`;
}

function yearsBetween(fromIso, toIso) {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return (b - a) / (365.25 * 24 * 3600 * 1000);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].replace(/^\uFEFF/, "").split(";");
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;
    rows.push({
      tipo: cols[idx["Tipo Titulo"]],
      vencimento: cols[idx["Data Vencimento"]],
      data: cols[idx["Data Base"]],
      taxaCompra: parseBrNumber(cols[idx["Taxa Compra Manha"]]),
      taxaVenda: parseBrNumber(cols[idx["Taxa Venda Manha"]]),
      pu: parseBrNumber(cols[idx["PU Base Manha"]]),
    });
  }
  return rows;
}

async function main() {
  process.stdout.write("Baixando taxas do Tesouro Direto...\n");
  const res = await fetch(CSV_URL, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/csv,*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar o CSV do Tesouro`);
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length < 100) throw new Error(`CSV inesperado: ${rows.length} linhas`);

  // O arquivo vem do mais recente para o mais antigo.
  const asOfBr = rows[0].data;
  const asOf = toIso(asOfBr);

  const quotes = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.data !== asOfBr) break;
    const family = FAMILIES[row.tipo];
    if (!family) continue;
    const key = `${row.tipo}|${row.vencimento}`;
    if (seen.has(key)) continue;
    seen.add(key);
    quotes.push({
      family,
      name: `${row.tipo} ${row.vencimento.slice(6)}`,
      maturity: toIso(row.vencimento),
      buyRate: row.taxaCompra / 100,
      sellRate: row.taxaVenda / 100,
      unitPrice: row.pu,
      yearsToMaturity: Number(yearsBetween(asOf, toIso(row.vencimento)).toFixed(2)),
    });
  }

  quotes.sort((a, b) => a.family.localeCompare(b.family) || a.maturity.localeCompare(b.maturity));

  // Série mensal do IPCA+ 2035: última observação de cada mês.
  const monthly = new Map();
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.tipo !== "Tesouro IPCA+" || row.vencimento !== IPCA_2035_MATURITY) continue;
    if (row.taxaCompra == null || row.pu == null) continue;
    monthly.set(toIso(row.data).slice(0, 7), {
      date: toIso(row.data),
      buyRate: Number((row.taxaCompra / 100).toFixed(6)),
      unitPrice: Number(row.pu.toFixed(2)),
    });
  }
  const ipca2035 = [...monthly.values()].sort((a, b) => a.date.localeCompare(b.date));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    asOf,
    source:
      "Tesouro Nacional — Tesouro Transparente, CSV de taxas dos títulos ofertados pelo Tesouro Direto",
    quotes,
    ipca2035,
  };

  await writeFile(OUT_FILE, JSON.stringify(snapshot));
  console.log(
    `Tesouro ${asOf}: ${quotes.length} títulos vigentes, ${ipca2035.length} meses de IPCA+ 2035`,
  );
}

main().catch((err) => {
  console.error("Falha ao baixar o Tesouro Direto:", err.message);
  process.exit(1);
});
