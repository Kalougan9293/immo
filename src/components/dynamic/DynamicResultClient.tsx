"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadFile } from "@/lib/download";
import { loadRenderSession, type RenderSession } from "@/lib/storage";
import { DEFAULT_TEMPLATE_ID } from "@/lib/product";

type DynamicResultClientProps = {
  templateId: string;
};

/** Écran final après génération / export (téléchargement). */
export function DynamicResultClient({ templateId }: DynamicResultClientProps) {
  const router = useRouter();
  const [result, setResult] = useState<RenderSession | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const session = loadRenderSession();
    if (!session || session.templateId !== templateId || !session.signedUrl) {
      router.replace(`/creer/medias?template=${templateId}`);
      return;
    }
    setResult(session);
  }, [templateId, router]);

  if (!result) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        Chargement…
      </div>
    );
  }

  const canReedit = Boolean(
    result.masterStoragePath && result.masterSignedUrl,
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-8">
      <div className="animate-fade-up pt-2 text-center">
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
          DYNAMIC
        </p>
        <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-pearl">
          Reel prêt
        </h2>
      </div>

      <div className="animate-fade-up animate-delay-1 relative mx-auto mt-6 aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[1.5rem] border border-border bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <video
          key={result.signedUrl}
          className="absolute inset-0 h-full w-full object-cover"
          src={result.signedUrl}
          controls
          playsInline
          autoPlay
          muted
          loop
        />
      </div>

      <div className="animate-fade-up animate-delay-2 mt-8 flex flex-col gap-3">
        <Button
          fullWidth
          variant="gold"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadFile(
                result.signedUrl,
                `areo-dynamic-${Date.now()}.mp4`,
              );
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download className="size-4" strokeWidth={1.75} />
          {downloading ? "Téléchargement…" : "Télécharger mon Reel"}
        </Button>
        {canReedit ? (
          <Button
            fullWidth
            variant="ghost"
            onClick={() =>
              router.push(`/creer/dynamic/edit?template=${templateId}`)
            }
          >
            Continuer d’ajuster
          </Button>
        ) : null}
        <Link
          href={`/creer/medias?template=${DEFAULT_TEMPLATE_ID}`}
          className="min-h-11 touch-manipulation py-3 text-center text-[13px] text-muted hover:text-pearl"
        >
          Nouveau Reel
        </Link>
      </div>
    </div>
  );
}
