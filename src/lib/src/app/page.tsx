"use client";

import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/landing/Hero";
import { useT } from "@/components/i18n/I18nProvider";

export default function HomePage() {
  const t = useT();

  return (
    <AppShell>
      <Header hideAccount />
      <main className="flex flex-1 flex-col">
        <Hero />
      </main>
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-6 sm:px-8 sm:pb-8">
        <p className="hero-footer text-[10px] font-medium tracking-wide sm:text-[11px]">
          {t.home.copyright}
        </p>
        <nav
          aria-label={t.home.legalNav}
          className="hero-footer ml-auto flex shrink-0 items-center gap-1.5 text-[10px] font-medium tracking-wide sm:gap-2 sm:text-[11px]"
        >
          <span className="cursor-default">{t.home.terms}</span>
          <span className="opacity-35" aria-hidden>
            ·
          </span>
          <span className="cursor-default">{t.home.sales}</span>
          <span className="opacity-35" aria-hidden>
            ·
          </span>
          <span className="cursor-default">{t.home.mentions}</span>
          <span className="opacity-35" aria-hidden>
            ·
          </span>
          <span className="cursor-default">{t.home.privacy}</span>
        </nav>
      </footer>
    </AppShell>
  );
}
