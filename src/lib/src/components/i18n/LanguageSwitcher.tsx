"use client";

import { cn } from "@/lib/utils";
import { useI18n, useSetLocale } from "@/components/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/config";

const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
};

export function LanguageSwitcher({
  onHero = false,
  className,
}: {
  onHero?: boolean;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const setLocale = useSetLocale();
  // Affiche la langue cible (clic = bascule)
  const next: Locale = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      title={`${t.lang.switchTo}: ${t.lang[next]}`}
      aria-label={`${t.lang.switchTo} ${t.lang[next]}`}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border text-[1.05rem] leading-none transition-opacity hover:opacity-100",
        onHero
          ? "border-white/25 bg-black/35 opacity-90 backdrop-blur-md"
          : "border-border bg-surface opacity-95",
        className,
      )}
    >
      <span aria-hidden>{FLAGS[next]}</span>
    </button>
  );
}
