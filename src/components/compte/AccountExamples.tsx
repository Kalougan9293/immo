"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import {
  ACCOUNT_EXAMPLES,
  type AccountExample,
} from "@/data/account-examples";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type AccountExamplesProps = {
  className?: string;
  /** Sur hero sombre : labels plus clairs */
  onHero?: boolean;
};

export function AccountExamples({
  className,
  onHero = false,
}: AccountExamplesProps) {
  const t = useT();
  const [active, setActive] = useState<AccountExample | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const modal =
    mounted && active
      ? createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            <button
              type="button"
              aria-label={t.common.close}
              className="absolute inset-0 cursor-default"
              onClick={() => setActive(null)}
            />
            <div className="relative z-10 max-h-[75dvh] w-auto max-w-[min(75vw,420px)]">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="absolute -top-2 -right-2 z-20 flex size-10 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white sm:top-2 sm:right-2"
                aria-label={t.common.close}
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
              <video
                key={active.video}
                src={active.video}
                playsInline
                autoPlay
                muted
                loop
                className="max-h-[75dvh] w-full rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <section className={cn(onHero ? "mt-8" : "mt-6", className)}>
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {ACCOUNT_EXAMPLES.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => setActive(ex)}
              className={cn(
                "group relative aspect-[9/14] w-full overflow-hidden rounded-xl border text-left outline-none transition-all active:scale-[0.98]",
                onHero
                  ? "border-white/20 bg-black/30 hover:border-white/45"
                  : "border-border bg-surface hover:border-gold/40",
              )}
              aria-label={ex.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ex.cover}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/5" />
              <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white opacity-90 backdrop-blur-sm">
                <Play className="size-3.5 fill-current" strokeWidth={0} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {modal}
    </section>
  );
}
