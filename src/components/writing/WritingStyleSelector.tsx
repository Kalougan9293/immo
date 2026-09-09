"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  WRITING_STYLES,
  type WritingStyle,
  type WritingStyleId,
} from "@/data/writing-styles";
import { Button } from "@/components/ui/Button";
import { getFont } from "@/lib/render/edit-options";
import {
  AREO_MEDIA_BUCKET,
  loadUploadSession,
} from "@/lib/storage";
import {
  loadWritingStyleId,
  saveWritingStyleId,
} from "@/lib/writing/session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type WritingStyleSelectorProps = {
  templateId: string;
};

const SAMPLE = {
  title: "Paris",
  line2: "16ème",
  meta: "3 pièces · 85 m²",
};

function PreviewCard({
  style,
  selected,
  previewUrl,
  onSelect,
  name,
  pacingLabel,
}: {
  style: WritingStyle;
  selected: boolean;
  previewUrl: string | null;
  onSelect: () => void;
  name: string;
  pacingLabel: string;
}) {
  const font = getFont(style.fontId);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-all",
        selected
          ? "border-gold/55 shadow-[0_0_0_1px_rgba(196,165,116,0.22),0_16px_40px_rgba(0,0,0,0.35)]"
          : "border-border hover:border-border-strong",
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-90"
            sizes="(max-width: 640px) 45vw, 220px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c22] to-[#0b0b0c]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-5 text-center">
          {style.pacing === "simultaneous" ? (
            <>
              <p
                className="text-[1.35rem] leading-tight"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                  fontWeight: style.fontId === "anton" ? 900 : 600,
                }}
              >
                {SAMPLE.title}
              </p>
              <p
                className="mt-0.5 text-[1.05rem] leading-tight opacity-95"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                }}
              >
                {SAMPLE.line2}
              </p>
              <p
                className="mt-2 text-[0.7rem] tracking-wide opacity-80"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                }}
              >
                {SAMPLE.meta}
              </p>
            </>
          ) : style.pacing === "cascade" ? (
            <>
              <p
                className="animate-fade-up text-[1.4rem] leading-tight"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                  fontWeight: style.fontId === "anton" ? 900 : 600,
                }}
              >
                {SAMPLE.title}
              </p>
              <p
                className="animate-fade-up animate-delay-1 mt-1 text-[0.95rem] opacity-90"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                }}
              >
                {SAMPLE.line2}
              </p>
              <p
                className="animate-fade-up animate-delay-2 mt-2 text-[0.68rem] tracking-wide opacity-75"
                style={{
                  fontFamily: font.cssFamily,
                  color: style.textColor,
                }}
              >
                {SAMPLE.meta}
              </p>
            </>
          ) : (
            <p
              className="text-[1.45rem] leading-tight"
              style={{
                fontFamily: font.cssFamily,
                color: style.textColor,
                fontWeight: style.fontId === "anton" ? 900 : 600,
                letterSpacing: style.cinemaLook ? "0.06em" : undefined,
              }}
            >
              {SAMPLE.title}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-0.5 px-3 py-3">
        <p className="font-display text-[15px] text-pearl">{name}</p>
        <p className="text-[11px] tracking-wide text-muted uppercase">
          {pacingLabel}
        </p>
      </div>
    </button>
  );
}

export function WritingStyleSelector({ templateId }: WritingStyleSelectorProps) {
  const t = useT();
  const router = useRouter();
  const [selected, setSelected] = useState<WritingStyleId>("editorial");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const upload = loadUploadSession();
    if (!upload || upload.templateId !== templateId || !upload.medias.length) {
      router.replace(`/creer/medias?template=${templateId}`);
      return;
    }

    const saved = loadWritingStyleId();
    if (saved) setSelected(saved);

    const first = upload.medias[0];
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .createSignedUrl(first.path, 60 * 30);
        setPreviewUrl(data?.signedUrl ?? first.previewUrl ?? null);
      } catch {
        setPreviewUrl(first.previewUrl ?? null);
      }
      setReady(true);
    })();
  }, [templateId, router]);

  const pacingLabels = useMemo(
    () => ({
      cascade: t.writing.pacingCascade,
      sequential: t.writing.pacingSequential,
      simultaneous: t.writing.pacingSimultaneous,
    }),
    [t],
  );

  const handleContinue = () => {
    saveWritingStyleId(selected);
    router.push(`/creer/infos?template=${templateId}`);
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="animate-fade-up px-5 pt-1 text-center sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          {t.writing.step}
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl sm:text-4xl">
          {t.writing.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          {t.writing.hint}
        </p>
      </div>

      <div className="animate-fade-up animate-delay-1 mx-auto mt-6 grid w-full max-w-lg grid-cols-2 gap-3 px-5 pb-4 sm:mt-8 sm:max-w-2xl sm:gap-4 sm:px-8">
        {WRITING_STYLES.map((style) => (
          <PreviewCard
            key={style.id}
            style={style}
            selected={selected === style.id}
            previewUrl={previewUrl}
            onSelect={() => setSelected(style.id)}
            name={t.writing.names[style.id] ?? style.id}
            pacingLabel={pacingLabels[style.pacing]}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 px-5 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-lg justify-center gap-3 sm:max-w-2xl">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/creer/medias?template=${templateId}`)
            }
          >
            {t.common.back}
          </Button>
          <Button
            fullWidth
            className="sm:w-auto sm:min-w-[220px]"
            variant="gold"
            showArrow
            onClick={handleContinue}
          >
            {t.writing.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
