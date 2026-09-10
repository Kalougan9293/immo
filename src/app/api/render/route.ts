import { after, NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";
import {
  buildSlideshowMp4,
  buildVeoReelMp4,
  renderFolderFromMediaPath,
} from "@/lib/render/ffmpeg";
import { normalizeEditOptions } from "@/lib/render/edit-options";
import {
  getVideosToEvict,
  MAX_SAVED_VIDEOS_PER_ACCOUNT,
} from "@/lib/video-retention";
import { getTemplateById } from "@/data/templates";
import {
  MAX_MEDIAS_PER_VIDEO,
  MAX_VIDEOS_PER_MONTAGE,
  MEDIA_LIMITS_COPY,
  validateMediaSelection,
} from "@/lib/media-limits";
import { engineForTemplate } from "@/lib/render/engine";
import { normalizeProperty } from "@/lib/dynamic/property";
import { hasFalCredentials } from "@/lib/ai/fal";
import {
  createRenderJob,
  failRenderJob,
  finishRenderJob,
  getRenderJob,
  patchRenderJob,
  type RenderJobResult,
} from "@/lib/render/jobs";

export const runtime = "nodejs";
/** Veo Lite : marge pour jusqu'a 12 photos (job en arrière-plan). */
export const maxDuration = 800;

type MediaPayload = {
  path: string;
  name: string;
  kind: "image" | "video" | "other";
};

type Body = {
  templateId: string;
  medias: MediaPayload[];
  edits?: unknown;
  replaceVideoId?: string | null;
  engine?: string;
  property?: unknown;
  /** DYNAMIC post-gen : master + signature, sans Veo */
  mode?: "generate" | "polish";
  /** Photo de couverture choisie à l’étape médias */
  coverPath?: string | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("job")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "job manquant." }, { status: 400 });
  }

  const job = getRenderJob(jobId);
  if (!job) {
    return NextResponse.json(
      {
        error:
          "Génération introuvable (serveur redémarré). Relance la génération.",
      },
      { status: 404 },
    );
  }

  if (job.status === "done" && job.result) {
    return NextResponse.json({
      ...job.result,
      jobId: job.id,
      status: "done",
      progress: 100,
      statusLabel: job.statusLabel,
    });
  }

  if (job.status === "error") {
    return NextResponse.json(
      {
        jobId: job.id,
        status: "error",
        error: job.error || "Échec de la génération.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    jobId: job.id,
    status: "running",
    progress: job.progress,
    statusLabel: job.statusLabel,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const templateId = body.templateId?.trim();
    const medias = Array.isArray(body.medias)
      ? body.medias.slice(0, MAX_MEDIAS_PER_VIDEO)
      : [];
    const edits = normalizeEditOptions(body.edits);
    const property = normalizeProperty(body.property);
    const mode = body.mode === "polish" ? "polish" : "generate";
    const replaceVideoId =
      typeof body.replaceVideoId === "string" && body.replaceVideoId.trim()
        ? body.replaceVideoId.trim()
        : null;
    const coverPath =
      typeof body.coverPath === "string" && body.coverPath.trim()
        ? body.coverPath.trim()
        : null;

    if (!templateId || !getTemplateById(templateId)) {
      return NextResponse.json({ error: "Template invalide." }, { status: 400 });
    }
    if (!medias.length) {
      return NextResponse.json({ error: "Aucun média." }, { status: 400 });
    }

    if (mode === "generate") {
      const mediaError = validateMediaSelection(medias);
      if (mediaError) {
        return NextResponse.json({ error: mediaError }, { status: 400 });
      }
    }

    const videoCount = medias.filter((m) => m.kind === "video").length;
    if (mode === "generate" && videoCount > MAX_VIDEOS_PER_MONTAGE) {
      return NextResponse.json(
        { error: MEDIA_LIMITS_COPY.noVideo },
        { status: 400 },
      );
    }

    const engine =
      mode === "polish" ? "ffmpeg" : engineForTemplate(templateId);

    if (engine === "veo-fast" && mode === "generate" && !hasFalCredentials()) {
      return NextResponse.json(
        {
          error:
            "Service de génération indisponible. FAL_KEY n’est pas visible sur le serveur Render (nom exact FAL_KEY, puis un nouveau deploy).",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const job = createRenderJob();
    const work = executeRenderJob({
      jobId: job.id,
      templateId,
      medias,
      edits,
      property,
      mode,
      engine,
      replaceVideoId,
      coverPath,
      userId: user?.id ?? null,
      supabase,
    });
    after(async () => {
      await work;
    });

    return NextResponse.json({
      jobId: job.id,
      status: "running",
      progress: job.progress,
      statusLabel: job.statusLabel,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de rendu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function executeRenderJob(input: {
  jobId: string;
  templateId: string;
  medias: MediaPayload[];
  edits: ReturnType<typeof normalizeEditOptions>;
  property: ReturnType<typeof normalizeProperty>;
  mode: "generate" | "polish";
  engine: ReturnType<typeof engineForTemplate> | "ffmpeg";
  replaceVideoId: string | null;
  coverPath: string | null;
  userId: string | null;
  supabase: Supabase;
}) {
  const {
    jobId,
    templateId,
    medias,
    edits,
    property,
    mode,
    engine,
    replaceVideoId,
    userId,
    supabase,
  } = input;

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "areo-dl-"));
  const localMedias: { localPath: string; kind: MediaPayload["kind"] }[] = [];

  try {
    patchRenderJob(jobId, { progress: 8, statusLabel: "Préparation" });

    for (let i = 0; i < medias.length; i++) {
      const media = medias[i];
      const { data, error } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .download(media.path);

      if (error || !data) {
        throw new Error(
          error?.message || `Impossible de télécharger ${media.name}`,
        );
      }

      const ext =
        path.extname(media.name) ||
        (media.kind === "video" ? ".mp4" : ".jpg");
      const localPath = path.join(
        tmpRoot,
        `src-${String(i).padStart(3, "0")}${ext}`,
      );
      await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
      localMedias.push({ localPath, kind: media.kind });
      patchRenderJob(jobId, {
        progress: 8 + Math.round(((i + 1) / medias.length) * 6),
        statusLabel: "Préparation",
      });
    }

    let mp4: Buffer;
    let masterStoragePath: string | null = null;
    let masterSignedUrl: string | null = null;
    let textLayers: unknown[] = [];
    let durationSec: number | null = null;

    const folder = renderFolderFromMediaPath(medias[0].path);
    const stamp = Date.now();

    if (engine === "veo-fast" && mode === "generate") {
      patchRenderJob(jobId, { progress: 16, statusLabel: "Plans cinéma" });
      const built = await buildVeoReelMp4(
        localMedias,
        templateId,
        edits,
        property,
        (info) => {
          if (info.phase === "assemble") {
            patchRenderJob(jobId, {
              progress: 88,
              statusLabel: "Assemblage",
            });
            return;
          }
          const ratio = info.total ? info.current / info.total : 0;
          patchRenderJob(jobId, {
            progress: 16 + Math.round(ratio * 70),
            statusLabel: "Plans cinéma",
          });
        },
      );
      mp4 = built.final;
      durationSec = built.durationSec;
      textLayers = built.textLayers;

      patchRenderJob(jobId, { progress: 92, statusLabel: "Finalisation" });
      const masterPath = `${folder}/${stamp}-areo-master.mp4`;
      const { error: masterUpErr } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .upload(masterPath, built.master, {
          contentType: "video/mp4",
          upsert: false,
          cacheControl: "3600",
        });
      if (masterUpErr) throw new Error(masterUpErr.message);
      masterStoragePath = masterPath;
      const { data: masterSigned, error: masterSignErr } =
        await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .createSignedUrl(masterPath, 60 * 60);
      if (masterSignErr || !masterSigned?.signedUrl) {
        throw new Error(masterSignErr?.message || "Master URL impossible.");
      }
      masterSignedUrl = masterSigned.signedUrl;
    } else {
      patchRenderJob(jobId, { progress: 30, statusLabel: "Assemblage" });
      mp4 = await buildSlideshowMp4(localMedias, templateId, edits);
    }

    const storagePath = `${folder}/${stamp}-areo.mp4`;

    const { error: uploadError } = await supabase.storage
      .from(AREO_MEDIA_BUCKET)
      .upload(storagePath, mp4, {
        contentType: "video/mp4",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: signed, error: signError } = await supabase.storage
      .from(AREO_MEDIA_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message || "URL signée impossible.");
    }

    let savedVideoId: string | null = null;
    let evicted = 0;
    let coverPath: string | null = null;
    let coverUrl: string | null = null;
    const template = getTemplateById(templateId);
    const sourcePaths = medias.map((m) => m.path);
    const firstImagePath =
      sourcePaths.find((p) =>
        /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(p),
      ) ?? null;
    const preferredCover =
      input.coverPath && sourcePaths.includes(input.coverPath)
        ? input.coverPath
        : firstImagePath;

    if (userId && replaceVideoId) {
      const { data: existing, error: existingError } = await supabase
        .from("areo_videos")
        .select("id, storage_path, cover_path, source_paths")
        .eq("id", replaceVideoId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      if (existing) {
        const nextSources =
          mode === "polish" && Array.isArray(existing.source_paths)
            ? (existing.source_paths as string[])
            : sourcePaths;

        const { error: updError } = await supabase
          .from("areo_videos")
          .update({
            template_id: templateId,
            title: template?.title ?? "Vidéo ARÉO",
            storage_path: storagePath,
            source_paths: nextSources,
          })
          .eq("id", replaceVideoId)
          .eq("user_id", userId);

        if (updError) throw new Error(updError.message);

        const oldPath = existing.storage_path as string;
        if (oldPath && oldPath !== storagePath) {
          await supabase.storage.from(AREO_MEDIA_BUCKET).remove([oldPath]);
        }
        savedVideoId = replaceVideoId;
        coverPath = (existing.cover_path as string | null) ?? null;
        if (mode === "generate" && preferredCover) {
          await supabase
            .from("areo_videos")
            .update({ cover_path: preferredCover })
            .eq("id", replaceVideoId)
            .eq("user_id", userId);
          coverPath = preferredCover;
        } else if (!coverPath && preferredCover) {
          await supabase
            .from("areo_videos")
            .update({ cover_path: preferredCover })
            .eq("id", replaceVideoId)
            .eq("user_id", userId);
          coverPath = preferredCover;
        }
      }
    }

    if (userId && !savedVideoId) {
      const { data: current, error: listError } = await supabase
        .from("areo_videos")
        .select("id, created_at, storage_path")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (listError) throw new Error(listError.message);

      const toEvict = getVideosToEvict(
        (current ?? []).map((row) => ({
          id: row.id as string,
          createdAt: row.created_at as string,
          storage_path: row.storage_path as string,
        })),
        1,
        MAX_SAVED_VIDEOS_PER_ACCOUNT,
      );

      for (const old of toEvict) {
        await supabase.storage
          .from(AREO_MEDIA_BUCKET)
          .remove([old.storage_path]);
        await supabase.from("areo_videos").delete().eq("id", old.id);
        evicted += 1;
      }

      coverPath = preferredCover;
      const { data: inserted, error: insertError } = await supabase
        .from("areo_videos")
        .insert({
          user_id: userId,
          template_id: templateId,
          title: template?.title ?? "Vidéo ARÉO",
          storage_path: storagePath,
          source_paths: sourcePaths,
          ...(coverPath ? { cover_path: coverPath } : {}),
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);
      savedVideoId = inserted.id as string;
    }

    if (!coverPath) {
      coverPath = preferredCover;
    }

    if (coverPath) {
      const { data: coverSigned } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .createSignedUrl(coverPath, 60 * 60);
      coverUrl = coverSigned?.signedUrl ?? null;
    }

    const result: RenderJobResult = {
      ok: true,
      engine,
      mode,
      status: "ready",
      storagePath,
      signedUrl: signed.signedUrl,
      masterStoragePath,
      masterSignedUrl,
      textLayers,
      durationSec,
      coverPath,
      coverUrl,
      saved: Boolean(userId),
      savedVideoId,
      evicted,
    };
    finishRenderJob(jobId, result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de rendu.";
    console.error("[render-job]", jobId, message);
    failRenderJob(jobId, message);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}
