"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RenderWaitingOverlay } from "@/components/medias/RenderWaitingOverlay";
import { loadPropertyListing } from "@/lib/dynamic/property";
import {
  AREO_MEDIA_BUCKET,
  loadUploadSession,
  saveRenderSession,
  type RenderSession,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

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

        setStatus("Chargement");
        tick = setInterval(() => {
          setProgress((p) => {
            if (p >= 88) return p;
            return Math.min(88, p + 0.12 + Math.random() * 0.2);
          });
        }, 1400);

        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            medias: upload.medias,
            property,
            // Pas d’edits CapCut — textes cinéma depuis property
            edits: {},
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          signedUrl?: string;
          storagePath?: string;
          masterStoragePath?: string | null;
          masterSignedUrl?: string | null;
          textLayers?: unknown[];
          durationSec?: number | null;
          coverUrl?: string | null;
          coverPath?: string | null;
          saved?: boolean;
          savedVideoId?: string | null;
          evicted?: number;
        };

        if (!res.ok) {
          throw new Error(data.error || "Échec de la génération.");
        }
        if (!data.signedUrl || !data.storagePath) {
          throw new Error("URL vidéo manquante.");
        }

        if (tick) clearInterval(tick);
        setStatus("Chargement");
        setProgress(100);
        await new Promise((r) => setTimeout(r, 550));

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
