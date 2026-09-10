"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type SiteFooterProps = {
  variant?: "hero" | "page";
};

export function SiteFooter({ variant = "page" }: SiteFooterProps) {
  const t = useT();
  const hero = variant === "hero";

  return (
    <footer
      className={cn(
        "relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-6 sm:px-8 sm:pb-8",
        !hero && "mt-auto border-t border-border pt-5",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-medium tracking-wide sm:text-[11px]",
          hero ? "hero-footer" : "text-muted",
        )}
      >
        {t.home.copyright}
      </p>
      <nav
        aria-label={t.home.legalNav}
        className={cn(
          "ml-auto flex shrink-0 items-center gap-1.5 text-[10px] font-medium tracking-wide sm:gap-2 sm:text-[11px]",
          hero ? "hero-footer" : "text-muted-strong",
        )}
      >
        <Link
          href="/tarifs"
          className={cn(
            "tracking-[0.12em] uppercase transition-opacity hover:opacity-100",
            hero
              ? "text-white/85 hover:text-white"
              : "text-pearl hover:text-gold",
          )}
        >
          {t.home.pricing}
        </Link>
        <span className="opacity-35" aria-hidden>
          ·
        </span>
        <Link
          href="/cgu"
          className={cn(
            "transition-opacity hover:opacity-100",
            hero ? "hover:text-white" : "hover:text-gold",
          )}
        >
          {t.home.terms}
        </Link>
        <span className="opacity-35" aria-hidden>
          ·
        </span>
        <Link
          href="/cgv"
          className={cn(
            "transition-opacity hover:opacity-100",
            hero ? "hover:text-white" : "hover:text-gold",
          )}
        >
          {t.home.sales}
        </Link>
        <span className="opacity-35" aria-hidden>
          ·
        </span>
        <Link
          href="/mentions"
          className={cn(
            "transition-opacity hover:opacity-100",
            hero ? "hover:text-white" : "hover:text-gold",
          )}
        >
          {t.home.mentions}
        </Link>
        <span className="opacity-35" aria-hidden>
          ·
        </span>
        <Link
          href="/confidentialite"
          className={cn(
            "transition-opacity hover:opacity-100",
            hero ? "hover:text-white" : "hover:text-gold",
          )}
        >
          {t.home.privacy}
        </Link>
      </nav>
    </footer>
  );
}
