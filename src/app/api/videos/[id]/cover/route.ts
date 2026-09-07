import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AREO_MEDIA_BUCKET } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }

    const { data: video, error: videoError } = await supabase
      .from("areo_videos")
      .select("id, cover_path, source_paths")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (videoError || !video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let coverPath: string | null = null;
    const oldCover = video.cover_path as string | null;
    const sources = Array.isArray(video.source_paths)
      ? (video.source_paths as string[])
      : [];

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { sourcePath?: string };
      const sourcePath = body.sourcePath?.trim();
      if (!sourcePath) {
        return NextResponse.json(
          { error: "sourcePath manquant." },
          { status: 400 },
        );
      }
      if (!sources.includes(sourcePath)) {
        return NextResponse.json(
          { error: "Ce média n’appartient pas à cette vidéo." },
          { status: 400 },
        );
      }
      const lower = sourcePath.toLowerCase();
      if (!/\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(lower)) {
        return NextResponse.json(
          { error: "Choisissez une image comme couverture." },
          { status: 400 },
        );
      }
      coverPath = sourcePath;
    } else {
      const form = await request.formData();
      const file = form.get("cover");

      if (!(file instanceof File) || !file.size) {
        return NextResponse.json({ error: "Image manquante." }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "La couverture doit être une image." },
          { status: 400 },
        );
      }

      const ext =
        file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";
      coverPath = `${user.id}/covers/${id}-${Date.now()}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(AREO_MEDIA_BUCKET)
        .upload(coverPath, buffer, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    const { error: updateError } = await supabase
      .from("areo_videos")
      .update({ cover_path: coverPath })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (
      oldCover &&
      oldCover !== coverPath &&
      oldCover.includes("/covers/")
    ) {
      await supabase.storage.from(AREO_MEDIA_BUCKET).remove([oldCover]);
    }

    const { data: signed } = await supabase.storage
      .from(AREO_MEDIA_BUCKET)
      .createSignedUrl(coverPath!, 60 * 60);

    return NextResponse.json({
      ok: true,
      coverPath,
      coverUrl: signed?.signedUrl ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur couverture.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
