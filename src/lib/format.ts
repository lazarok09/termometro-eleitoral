/**
 * Locale-aware formatters. Client components should pass the active locale
 * from `useLocale()` (next-intl). Server code can use `getLocale()`.
 */

const BRL_LOCALES: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

function intlLocale(locale?: string): string {
  return BRL_LOCALES[locale ?? "pt"] ?? "pt-BR";
}

export function money(value: number | null | undefined, locale = "pt"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = (value * 100).toFixed(digits);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}

export function ratio(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function marketCap(value: number | null | undefined, locale = "pt"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const compact = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const suffix =
    locale === "en"
      ? value >= 1e9
        ? "bn"
        : "m"
      : value >= 1e9
        ? "bi"
        : "mi";
  const scaled = value >= 1e9 ? value / 1e9 : value / 1e6;
  return `R$ ${compact.format(scaled)} ${suffix}`;
}

export function shortDate(iso: string, locale = "pt"): string {
  const [y, m, d] = iso.split("-");
  if (locale === "en") return `${m}/${d}/${y}`;
  return `${d}/${m}/${y}`;
}

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthYear(iso: string, locale = "pt"): string {
  const [y, m] = iso.split("-");
  const months = locale === "en" ? MONTHS_EN : MONTHS_PT;
  return `${months[Number(m) - 1]}/${y.slice(2)}`;
}

/** Green for gains, red for losses — Brazilian market convention. */
export function toneForValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "text-muted-foreground";
  if (value > 0.0001) return "text-emerald-400";
  if (value < -0.0001) return "text-rose-400";
  return "text-muted-foreground";
}

export function formatInteger(value: number, locale = "pt"): string {
  return value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 0 });
}
