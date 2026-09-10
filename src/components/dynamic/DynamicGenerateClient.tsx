"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RenderWaitingOverlay } from "@/components/medias/RenderWaitingOverlay";
import { loadPropertyListing } from "@/lib/dynamic/property";
import { loadWritingStyleId } from "@/lib/writing/session";
import {
  AREO_MEDIA_BUCKET,
  loadUploadSession,
  saveRenderSession,
  type RenderSession,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { runRenderApi } from "@/lib/render/client";

type DynamicGenerateClientProps = {
  templateId: string;
};

export function DynamicGenerateClient({
  templateId,
}: DynamicGenerateClientProps) {
  const router = useRouter();
  const started = useRef(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState("Chargement");
  const [progress, setProgress] = useState(6);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const upload = loadUploadSession();
    const property = loadPropertyListing();
    const writingStyleId = loadWritingStyleId();

    if (!upload || upload.templateId !== templateId || !upload.medias.length) {
      router.replace(`/creer/medias?template=${templateId}`);
      return;
    }
    if (!property) {
      router.replace(`/creer/infos?template=${templateId}`);
      return;
    }

    let tick: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      try {
        const supabase = createClient();
        const paths = upload.medias.map((m) => m.path);
        const { data: signed } = await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .createSignedUrls(paths, 60 * 30);
        const urls =
          signed
            ?.map((s) => s.signedUrl)
            .filter((u): u is string => Boolean(u)) ?? [];
        setPreviews(urls);

        setStatus("Préparation");
        setProgress(6);
        const photoCount = Math.max(1, upload.medias.length);
        // ~22 s / plan Veo 1080p + marge assemblage (estimation, pas un timer aléatoire)
        const estMs = 14_000 + photoCount * 22_000;
        const startedAt = Date.now();
        let serverDriven = false;
        tick = setInterval(() => {
          if (serverDriven) return;
          const ratio = (Date.now() - startedAt) / estMs;
          // Courbe douce → plafonne à 90 % jusqu’à la fin réelle
          const eased = 1 - Math.exp(-ratio * 1.35);
          const next = Math.min(90, 6 + eased * 84);
          setProgress(next);
          if (next < 12) setStatus("Préparation");
          else if (next < 72) setStatus("Plans cinéma");
          else if (next < 86) setStatus("Assemblage");
          else setStatus("Finalisation");
        }, 450);

        const data = await runRenderApi(
          {
            templateId,
            medias: upload.medias,
            property,
            coverPath: upload.coverPath ?? null,
            edits: writingStyleId ? { writingStyleId } : {},
          },
          ({ progress: p, statusLabel }) => {
            serverDriven = true;
            if (typeof p === "number") {
              setProgress((cur) => Math.max(cur, Math.min(96, p)));
            }
            if (statusLabel) setStatus(statusLabel);
          },
        );

        if (tick) clearInterval(tick);
        setStatus("Finalisation");
        setProgress(100);
        await new Promise((r) => setTimeout(r, 450));

        const session: RenderSession = {
          templateId,
          signedUrl: data.signedUrl,
          storagePath: data.storagePath,
          masterStoragePath: data.masterStoragePath ?? null,
          masterSignedUrl: data.masterSignedUrl ?? null,
          textLayers: data.textLayers ?? [],
          durationSec: data.durationSec ?? null,
          coverUrl: data.coverUrl ?? null,
          coverPath: data.coverPath ?? null,
          saved: Boolean(data.saved),
          savedVideoId: data.savedVideoId ?? null,
          evicted: data.evicted ?? 0,
          mediaCount: upload.medias.length,
          createdAt: new Date().toISOString(),
        };
        saveRenderSession(session);
        router.replace(`/creer/dynamic/edit?template=${templateId}`);
      } catch (e) {
        if (tick) clearInterval(tick);
        setError(
          e instanceof Error
            ? e.message.includes("drawtext") || e.message.includes("Filter")
              ? "Erreur d’écriture des textes. Réessaie ou simplifie le texte (évite € et apostrophes)."
              : e.message.length > 220
                ? `${e.message.slice(0, 200)}…`
                : e.message
            : "Erreur de génération.",
        );
      }
    })();

    return () => {
      if (tick) clearInterval(tick);
    };
  }, [templateId, router]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-pearl">Génération interrompue</p>
        <p className="mt-3 text-[14px] text-red-400" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="mt-8 text-[14px] text-gold underline-offset-4 hover:underline"
          onClick={() => router.push(`/creer/infos?template=${templateId}`)}
        >
          Retour aux infos
        </button>
      </div>
    );
  }

  return (
    <RenderWaitingOverlay
      previews={previews}
      status={status}
      progress={progress}
    />
  );
}
