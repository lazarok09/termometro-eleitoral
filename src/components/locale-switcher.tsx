import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Locale switch as server-rendered Links so Next.js can prerender and prefetch
 * the alternate locale (generateStaticParams already builds pt + en).
 * @see https://nextjs.org/docs/app/guides/internationalization
 */
export async function LocaleSwitcher({ className }: { className?: string }) {
  const t = await getTranslations("LocaleSwitcher");
  const locale = await getLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/50 p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label={t("label")}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        const itemClass = cn(
          "rounded-md px-2.5 py-1 font-medium transition-colors",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground",
        );

        if (active) {
          return (
            <span key={code} className={itemClass} aria-current="true">
              {t(code)}
            </span>
          );
        }

        return (
          <Link
            key={code}
            href="/"
            locale={code}
            prefetch
            hrefLang={code}
            className={itemClass}
          >
            {t(code)}
          </Link>
        );
      })}
    </div>
  );
}
