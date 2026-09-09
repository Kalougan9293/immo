"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import {
  getTemplateById,
  templatesByCategory,
  type Template,
  type TemplateCategory,
  type TemplateId,
} from "@/data/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

function Slide({
  template,
  active,
  onOpen,
}: {
  template: Template;
  active: boolean;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDemo = Boolean(template.demo);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasDemo) return;
    if (active) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, hasDemo, template.id]);

  return (
    <div className="snap-center flex w-[min(72vw,280px)] shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Apercu — ${template.title}`}
        className={cn(
          "relative aspect-[9/16] w-full overflow-hidden rounded-[1.75rem] border outline-none transition-all duration-500",
          active
            ? "scale-100 border-gold/50 shadow-[0_0_0_1px_rgba(196,165,116,0.22),0_24px_60px_rgba(0,0,0,0.45)]"
            : "scale-[0.88] border-border opacity-55",
        )}
      >
        <span
          className="absolute inset-0"
          style={{ background: template.preview }}
        />
        <Image
          src={template.cover}
          alt=""
          fill
          sizes="280px"
          priority={active}
          className={cn(
            "object-cover transition-opacity duration-500",
            active && hasDemo ? "opacity-0" : "opacity-100",
          )}
        />
        {hasDemo ? (
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              active ? "opacity-100" : "opacity-0",
            )}
            src={template.demo}
            muted
            loop
            playsInline
            preload={active ? "auto" : "metadata"}
            aria-hidden
          />
        ) : null}
        {!active && hasDemo ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white/80 backdrop-blur-md">
              <Play className="size-3.5 fill-current" strokeWidth={0} />
            </span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

export function TemplateSelector() {
  const t = useT();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<TemplateCategory>("dynamic");
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<TemplateId | null>(null);
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);

  const visible = useMemo(
    () => templatesByCategory(category),
    [category],
  );

  const carouselSelected = visible[index] ?? null;

  const previewTemplate = previewId
    ? (getTemplateById(previewId) ?? null)
    : null;

  const scrollToIndex = useCallback((next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.children[next] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.children.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const mid = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setIndex(best);
    const tpl = visible[best];
    if (tpl) setSelectedId(tpl.id);
  }, [visible]);

  useEffect(() => {
    setIndex(0);
    setSelectedId(visible[0]?.id ?? null);
    const el = scrollerRef.current;
    if (el) el.scrollLeft = 0;
  }, [category, visible]);

  const handleCategory = (next: TemplateCategory) => {
    setCategory(next);
    setPreviewId(null);
  };

  const handleContinue = () => {
    const id = selectedId ?? carouselSelected?.id;
    if (!id) return;
    router.push(`/creer/medias?template=${id}`);
  };

  const handleUse = (id: TemplateId) => {
    setPreviewId(null);
    router.push(`/creer/medias?template=${id}`);
  };

  const go = (delta: number) => {
    const next = Math.min(Math.max(index + delta, 0), visible.length - 1);
    setIndex(next);
    const tpl = visible[next];
    if (tpl) setSelectedId(tpl.id);
    scrollToIndex(next);
  };

  const canContinue = Boolean(selectedId ?? carouselSelected);

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          {t.templates.step}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          {t.templates.title}
        </h2>

        <div
          className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border bg-surface/80 p-1"
          role="tablist"
          aria-label="Categorie de modeles"
        >
          {(
            [
              ["dynamic", t.templates.categoryDynamic],
              ["classic", t.templates.categoryClassic],
            ] as const
          ).map(([id, label]) => {
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleCategory(id)}
                className={cn(
                  "min-h-11 touch-manipulation rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.14em] transition-colors",
                  active
                    ? "bg-gold text-background shadow-[0_0_20px_rgba(196,165,116,0.28)]"
                    : "text-muted-strong hover:text-pearl",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile : carrousel */}
      <div className="animate-fade-up animate-delay-1 relative mt-6 flex flex-1 flex-col md:hidden">
        <div className="relative">
          <button
            type="button"
            aria-label="Style precedent"
            disabled={index <= 0}
            onClick={() => go(-1)}
            className="absolute top-1/2 left-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 text-pearl backdrop-blur-md transition-opacity disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Style suivant"
            disabled={index >= visible.length - 1}
            onClick={() => go(1)}
            className="absolute top-1/2 right-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 text-pearl backdrop-blur-md transition-opacity disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>

          <div
            ref={scrollerRef}
            onScroll={syncIndexFromScroll}
            className="scrollbar-none snap-x-mandatory flex snap-mandatory gap-3 overflow-x-auto scroll-smooth px-[calc(50%-min(36vw,140px))] pb-2"
          >
            {visible.map((template, i) => (
              <Slide
                key={template.id}
                template={template}
                active={i === index}
                onOpen={() => setPreviewId(template.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 px-5 text-center">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Styles">
            {visible.map((template, i) => (
              <button
                key={template.id}
                type="button"
                aria-label={t.templates.names[template.id] ?? template.title}
                aria-current={i === index}
                onClick={() => {
                  setIndex(i);
                  setSelectedId(template.id);
                  scrollToIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index
                    ? "w-6 bg-gold"
                    : "w-1.5 bg-border-strong hover:bg-muted-strong",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop : grille comme avant */}
      <div className="animate-fade-up animate-delay-1 mx-auto mt-8 hidden w-full max-w-lg grid-cols-2 gap-3 px-5 pb-4 md:grid sm:max-w-2xl sm:gap-4 sm:px-8 lg:max-w-3xl lg:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            onSelect={setSelectedId}
            onPreview={setPreviewId}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center sm:max-w-2xl">
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant={canContinue ? "gold" : "primary"}
            disabled={!canContinue}
            showArrow
            onClick={handleContinue}
          >
            {t.templates.continue}
          </Button>
        </div>
      </div>

      {previewTemplate ? (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewId(null)}
          onUse={handleUse}
        />
      ) : null}
    </div>
  );
}
