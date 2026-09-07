"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Play } from "lucide-react";
import type { Template } from "@/data/templates";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type TemplateCardProps = {
  template: Template;
  selected: boolean;
  onSelect: (id: Template["id"]) => void;
  onPreview: (id: Template["id"]) => void;
};

export function TemplateCard({
  template,
  selected,
  onSelect,
  onPreview,
}: TemplateCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasDemo = Boolean(template.demo);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasDemo) return;
    if (hovering) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [hovering, hasDemo]);

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl text-left transition-all duration-300 ease-out",
        "border bg-surface",
        selected
          ? "border-gold/55 shadow-[0_0_0_1px_rgba(196,165,116,0.25),0_0_32px_rgba(196,165,116,0.16)]"
          : "border-border hover:border-border-strong",
      )}
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          onClick={() => onPreview(template.id)}
          aria-label={`Voir l’aperçu ${template.title}`}
          className="absolute inset-0 z-0 outline-none active:scale-[0.985]"
        >
          <span
            className="absolute inset-0"
            style={{ background: template.preview }}
          />
          <Image
            src={template.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 240px"
            className={cn(
              "object-cover transition-all duration-500 group-hover:scale-[1.04]",
              hasDemo && hovering ? "opacity-0" : "opacity-100",
            )}
          />
          {hasDemo ? (
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                hovering ? "opacity-100" : "opacity-0",
              )}
              src={template.demo}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            />
          ) : null}
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        </button>

        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
          <Badge
            tone="overlay"
            className={
              selected
                ? "!border-gold/60 !bg-black/80 !text-[#f0e0c0] shadow-[0_2px_16px_rgba(196,165,116,0.35)]"
                : undefined
            }
          >
            {template.badge}
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => onSelect(template.id)}
          aria-label={
            selected
              ? `${template.title} sélectionné`
              : `Sélectionner ${template.title}`
          }
          aria-pressed={selected}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full border transition-all duration-300",
            selected
              ? "border-gold bg-gold text-background shadow-[0_0_16px_var(--gold-glow)]"
              : "border-white/25 bg-black/55 text-white/70 backdrop-blur-md hover:border-white/40 hover:text-white",
          )}
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </button>

        {hasDemo ? (
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center opacity-90 transition-opacity group-hover:opacity-0">
            <span className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <Play className="size-4 fill-current" strokeWidth={0} />
            </span>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
          <h3 className="font-display text-[1.05rem] leading-tight font-semibold tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_2px_12px_rgba(0,0,0,0.75)]">
            {template.title}
          </h3>
        </div>
      </div>

      {selected ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(196,165,116,0.4)]"
        />
      ) : null}
    </div>
  );
}
