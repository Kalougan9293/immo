"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeaderAccountLink } from "@/components/layout/HeaderAccountLink";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/I18nProvider";

type HeaderProps = {
  showBack?: boolean;
  backHref?: string;
  stepLabel?: string;
  /** Masque le menu Compte (ex. landing : lien sous le CTA) */
  hideAccount?: boolean;
  className?: string;
};

export function Header({
  showBack = false,
  backHref = "/",
  stepLabel,
  hideAccount = false,
  className,
}: HeaderProps) {
  const t = useT();

  return (
    <header
      className={cn(
        "relative z-20 flex h-14 items-center justify-between px-5 sm:h-16 sm:px-8",
        className,
      )}
    >
      <div className="flex min-w-[4.5rem] items-center">
        {showBack ? (
          <Link
            href={backHref}
            className="group flex items-center gap-1.5 text-sm text-muted-strong transition-colors hover:text-pearl"
            aria-label={t.common.back}
          >
            <span
              aria-hidden
              className="inline-block transition-transform group-hover:-translate-x-0.5"
            >
              ←
            </span>
            <span className="hidden sm:inline">{t.common.back}</span>
          </Link>
        ) : (
          <span className="w-10" aria-hidden />
        )}
      </div>

      <Link
        href="/"
        className={cn(
          "font-display text-[1.35rem] font-semibold tracking-[0.18em] transition-opacity hover:opacity-90 sm:text-2xl",
          showBack ? "text-pearl" : "hero-nav",
        )}
      >
        ARÉO
      </Link>

      <div className="flex min-w-[4.5rem] items-center justify-end gap-2">
        {hideAccount && !showBack ? (
          <LanguageSwitcher onHero />
        ) : null}
        {stepLabel ? (
          <span className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
            {stepLabel}
          </span>
        ) : hideAccount ? null : (
          <HeaderAccountLink onHero={!showBack} />
        )}
      </div>
    </header>
  );
}
