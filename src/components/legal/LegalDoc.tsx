import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BLANK, LEGAL } from "@/lib/legal";
import type { LegalDocData } from "@/lib/legal-docs";
import type { ReactNode } from "react";

function withBlanks(text: string): ReactNode {
  const parts = text.split(BLANK);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <span key={`${part}-${i}`}>
      {part}
      {i < parts.length - 1 ? (
        <span
          className="mx-1 inline-block min-w-[6.5rem] border-b border-pearl/30 align-baseline"
          aria-label="À renseigner"
        />
      ) : null}
    </span>
  ));
}

export function LegalDoc({ doc }: { doc: LegalDocData }) {
  return (
    <AppShell contained>
      <Header showBack backHref="/" />
      <main className="flex flex-1 flex-col px-5 pb-12 sm:px-8">
        <article className="animate-fade-up mx-auto w-full max-w-2xl pt-4">
          <h1 className="font-display text-4xl font-medium text-pearl sm:text-5xl">
            {doc.title}
          </h1>
          <p className="mt-3 text-[12px] tracking-wide text-muted">
            Dernière mise à jour : {LEGAL.updated}
          </p>
          {doc.intro ? (
            <p className="mt-6 text-[15px] leading-relaxed text-muted-strong">
              {doc.intro}
            </p>
          ) : null}
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="text-[13px] font-semibold tracking-[0.08em] text-pearl uppercase">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted-strong">
                {section.paragraphs.map((p, i) => (
                  <p key={`${section.heading}-${i}`}>{withBlanks(p)}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </AppShell>
  );
}
