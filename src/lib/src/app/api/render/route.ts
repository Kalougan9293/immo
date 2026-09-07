import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";
import {
  buildSlideshowMp4,
  renderFolderFromMediaPath,
} from "@/lib/render/ffmpeg";
import { normalizeEditOptions } from "@/lib/render/edit-options";
import {
  getVideosToEvict,
  MAX_SAVED_VIDEOS_PER_ACCOUNT,
} from "@/lib/video-retention";
import { getTemplateById } from "@/data/templates";
import { MAX_MEDIAS_PER_VIDEO } from "@/lib/media-limits";

export const runtime = "nodejs";
export const maxDuration = 120;

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
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const templateId = body.templateId?.trim();
    const medias = Array.isArray(body.medias)
      ? body.medias.slice(0, MAX_MEDIAS_PER_VIDEO)
      : [];
    const edits = normalizeEditOptions(body.edits);
    const replaceVideoId =
      typeof body.replaceVideoId === "string" && body.replaceVideoId.trim()
        ? body.replaceVideoId.trim()
        : null;

    if (!templateId || !getTemplateById(templateId)) {
      return NextResponse.json({ error: "Template invalide." }, { status: 400 });
    }
    if (!medias.length) {
      return NextResponse.json({ error: "Aucun média." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? null;
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "areo-dl-"));
    const localMedias: { localPath: string; kind: MediaPayload["kind"] }[] =
      [];

    try {
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
      }

      const mp4 = await buildSlideshowMp4(localMedias, templateId, edits);
      const folder = renderFolderFromMediaPath(medias[0].path);
      const storagePath = `${folder}/${Date.now()}-areo.mp4`;

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
      const template = getTemplateById(templateId);
      const sourcePaths = medias.map((m) => m.path);

      if (userId && replaceVideoId) {
        const { data: existing, error: existingError } = await supabase
          .from("areo_videos")
          .select("id, storage_path")
          .eq("id", replaceVideoId)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingError) throw new Error(existingError.message);

        if (existing) {
          const { error: updError } = await supabase
            .from("areo_videos")
            .update({
              template_id: templateId,
              title: template?.title ?? "Vidéo ARÉO",
              storage_path: storagePath,
              source_paths: sourcePaths,
            })
            .eq("id", replaceVideoId)
            .eq("user_id", userId);

          if (updError) throw new Error(updError.message);

          const oldPath = existing.storage_path as string;
          if (oldPath && oldPath !== storagePath) {
            await supabase.storage.from(AREO_MEDIA_BUCKET).remove([oldPath]);
          }
          savedVideoId = replaceVideoId;
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

        const { data: inserted, error: insertError } = await supabase
          .from("areo_videos")
          .insert({
            user_id: userId,
            template_id: templateId,
            title: template?.title ?? "Vidéo ARÉO",
            storage_path: storagePath,
            source_paths: sourcePaths,
          })
          .select("id")
          .single();

        if (insertError) throw new Error(insertError.message);
        savedVideoId = inserted.id as string;
      }

      return NextResponse.json({
        ok: true,
        engine: "ffmpeg",
        status: "ready",
        storagePath,
        signedUrl: signed.signedUrl,
        saved: Boolean(userId),
        savedVideoId,
        evicted,
      });
    } finally {
      await fs
        .rm(tmpRoot, { recursive: true, force: true })
        .catch(() => undefined);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de rendu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
