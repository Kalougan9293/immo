"use client";

import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function HomePage() {
  return (
    <AppShell>
      <Header hideAccount />
      <main className="flex flex-1 flex-col">
        <Hero />
      </main>
      <SiteFooter variant="hero" />
    </AppShell>
  );
}
