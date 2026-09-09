"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getTemplateById,
  templatesByCategory,
  type TemplateCategory,
  type TemplateId,
} from "@/data/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

export function TemplateSelector() {
  const t = useT();
  const router = useRouter();
  const [category, setCategory] = useState<TemplateCategory>("dynamic");
  const [selected, setSelected] = useState<TemplateId | null>(null);
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);

  const visible = useMemo(
    () => templatesByCategory(category),
    [category],
  );

  const previewTemplate = previewId ? (getTemplateById(previewId) ?? null) : null;

  const handleCategory = (next: TemplateCategory) => {
    setCategory(next);
    setSelected(null);
    setPreviewId(null);
  };

  const handleContinue = () => {
    if (!selected) return;
    router.push(`/creer/medias?template=${selected}`);
  };

  const handleUse = (id: TemplateId) => {
    setSelected(id);
    setPreviewId(null);
    router.push(`/creer/medias?template=${id}`);
  };

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          {t.templates.step}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          {t.templates.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          {t.templates.hint}
          <br />
          {t.templates.hint2}
        </p>

        <div
          className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border bg-surface/80 p-1"
          role="tablist"
          aria-label="Catégorie de modèles"
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

      <div className="animate-fade-up animate-delay-1 mx-auto mt-6 grid w-full max-w-lg grid-cols-2 gap-3 px-5 pb-4 sm:mt-8 sm:max-w-2xl sm:gap-4 sm:px-8">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selected === template.id}
            onSelect={setSelected}
            onPreview={setPreviewId}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center sm:max-w-2xl">
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant={selected ? "gold" : "primary"}
            disabled={!selected}
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
