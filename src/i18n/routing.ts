import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];

/** Brazil and Portuguese-speaking countries → pt; everyone else → en. */
export function localeFromCountry(country: string | null | undefined): AppLocale {
  if (!country) return routing.defaultLocale;
  const code = country.toUpperCase();
  if (code === "BR" || code === "PT" || code === "AO" || code === "MZ") return "pt";
  return "en";
}
