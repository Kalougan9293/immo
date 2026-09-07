"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RenderWaitingOverlayProps = {
  previews: string[];
  status: string;
  /** 0–100 */
  progress: number;
};

export function RenderWaitingOverlay({
  previews,
  status,
  progress,
}: RenderWaitingOverlayProps) {
  const [index, setIndex] = useState(0);
  const slides = previews.filter(Boolean);
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/92 px-6 backdrop-blur-xl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[1.5rem] border border-border shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {slides.length ? (
          slides.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                i === index ? "opacity-100 wait-kenburns" : "opacity-0",
              )}
            />
          ))
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4">
          <Loader2 className="size-4 animate-spin text-gold" strokeWidth={1.75} />
          <span className="text-[12px] font-medium tracking-wide text-white/90">
            ARÉO
          </span>
        </div>
      </div>

      <h2 className="mt-8 font-display text-2xl font-medium tracking-tight text-pearl sm:text-3xl">
        {status}
      </h2>

      <p className="mt-3 font-display text-4xl font-medium tabular-nums text-gold">
        {pct}%
      </p>

      <div className="mt-4 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
