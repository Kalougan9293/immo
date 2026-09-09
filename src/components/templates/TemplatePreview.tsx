"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { Template } from "@/data/templates";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type TemplatePreviewProps = {
  template: Template;
  onClose: () => void;
  onUse: (id: Template["id"]) => void;
};

export function TemplatePreview({
  template,
  onClose,
  onUse,
}: TemplatePreviewProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [template.id, onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du modèle"
    >
      <button
        type="button"
        aria-label={t.common.close}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden",
          "rounded-t-[1.75rem] border border-border bg-surface shadow-[0_-8px_48px_rgba(0,0,0,0.45)]",
          "sm:mx-4 sm:max-h-[min(92dvh,880px)] sm:rounded-[1.75rem]",
        )}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-strong transition-colors hover:border-border-strong hover:text-pearl"
            aria-label={t.common.close}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative mx-auto aspect-[9/16] w-full max-h-[min(62dvh,560px)] overflow-hidden bg-black sm:max-h-[min(68dvh,640px)]">
            {template.demo ? (
              <video
                ref={videoRef}
                key={template.demo}
                className="absolute inset-0 h-full w-full object-cover"
                src={template.demo}
                poster={template.cover}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
              />
            ) : (
              <>
                <Image
                  src={template.cover}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="400px"
                  priority
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5">
                  <p className="text-sm text-white/85">{t.templates.previewSoon}</p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              fullWidth
              variant="gold"
              showArrow
              onClick={() => onUse(template.id)}
            >
              {t.templates.useModel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
