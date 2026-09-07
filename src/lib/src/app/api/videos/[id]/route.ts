import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnedVideo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, video: null, error: "Non connecté." as const };
  }

  const { data: video, error } = await supabase
    .from("areo_videos")
    .select("id, title, template_id, storage_path, source_paths, cover_path, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !video) {
    return {
      supabase,
      user,
      video: null,
      error: "Vidéo introuvable." as const,
    };
  }

  return { supabase, user, video, error: null };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, video, error } = await getOwnedVideo(id);

    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (error || !video) {
      return NextResponse.json({ error: error || "Vidéo introuvable." }, { status: 404 });
    }

    const body = (await request.json()) as { title?: string };
    const title = body.title?.trim();

    if (!title || title.length < 1 || title.length > 80) {
      return NextResponse.json(
        { error: "Titre invalide (1–80 caractères)." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("areo_videos")
      .update({ title })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, video, error } = await getOwnedVideo(id);

    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (error || !video) {
      return NextResponse.json({ error: error || "Vidéo introuvable." }, { status: 404 });
    }

    const toRemove: string[] = [];
    if (video.storage_path) toRemove.push(video.storage_path as string);
    if (video.cover_path) toRemove.push(video.cover_path as string);

    if (toRemove.length) {
      await supabase.storage.from(AREO_MEDIA_BUCKET).remove(toRemove);
    }

    const { error: deleteError } = await supabase
      .from("areo_videos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, video, error } = await getOwnedVideo(id);

    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (error || !video) {
      return NextResponse.json({ error: error || "Vidéo introuvable." }, { status: 404 });
    }

    const sourcePaths = Array.isArray(video.source_paths)
      ? (video.source_paths as string[])
      : [];

    const medias: {
      path: string;
      name: string;
      kind: "image" | "video" | "other";
      size: number;
      previewUrl: string | null;
    }[] = [];

    for (const path of sourcePaths) {
      const { data: signed } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .createSignedUrl(path, 60 * 60);

      const name = path.split("/").pop() || "media";
      const lower = name.toLowerCase();
      const kind: "image" | "video" | "other" =
        /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(lower)
          ? "image"
          : /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(lower)
            ? "video"
            : "other";

      medias.push({
        path,
        name,
        kind,
        size: 0,
        previewUrl: signed?.signedUrl ?? null,
      });
    }

    return NextResponse.json({
      ok: true,
      templateId: video.template_id as string,
      medias,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
