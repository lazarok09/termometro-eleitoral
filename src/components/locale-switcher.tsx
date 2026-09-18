"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/50 p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label={t("label")}
    >
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-colors",
            code === locale
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={code === locale}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}
