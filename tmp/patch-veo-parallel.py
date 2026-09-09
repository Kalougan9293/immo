from pathlib import Path

p = Path(r"D:\Desktop\IMMO\src\lib\render\ffmpeg.ts")
t = p.read_text(encoding="utf-8")
start = t.find("/**\n * Photos → Veo 3.1 Fast (I2V) → normalize → xfade cinéma")
end = t.find("export function renderFolderFromMediaPath", start)
if start < 0 or end < 0:
    raise SystemExit(f"markers {start} {end}")

new = r'''/**
 * Photos → Veo 3.1 Fast (I2V, parallèle) → xfade → master sans texte + final textes.
 */
export type VeoReelBuildResult = {
  final: Buffer;
  master: Buffer;
  durationSec: number;
  textLayers: TextLayerEdit[];
};

export async function buildVeoReelMp4(
  medias: LocalMediaInput[],
  templateId = "appartement-premium",
  edits?: RenderEditOptions,
  property?: PropertyListing | null,
): Promise<VeoReelBuildResult> {
  if (!medias.length) {
    throw new Error("Aucun média à monter.");
  }

  const listing = property ? normalizeProperty(property) : null;
  const cinema = getCinemaStyle(templateId);
  const base = getRecipe(templateId);
  const recipe: RenderRecipe = {
    ...base,
    fadeSeconds: cinema.fadeSeconds,
    transition: edits?.transition || cinema.transitions[0] || "fadeblack",
    tripleStrip: false,
    grade: cinema.grade,
  };

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "areo-veo-"));

  try {
    const limited = (
      base.singleShot ? medias.slice(0, 1) : medias
    ).slice(0, MAX_MEDIAS_PER_VIDEO);

    // Veo en parallèle = durée ~ max(clip) au lieu de la somme
    const clips = await Promise.all(
      limited.map(async (media, i) => {
        const clipPath = path.join(
          workDir,
          `clip-${String(i).padStart(3, "0")}.mp4`,
        );

        if (media.kind === "video") {
          const overrideDuration = edits?.clipDurations?.[i];
          const trimStart = edits?.clipTrimStarts?.[i] ?? 0;
          const duration = await videoToClip(
            media.localPath,
            clipPath,
            recipe,
            overrideDuration ?? recipe.videoMaxSeconds,
            trimStart,
          );
          return { path: clipPath, duration };
        }

        console.log(
          `[veo-reel] clip ${i + 1}/${limited.length} — Veo Fast (parallèle)…`,
        );
        const imageUrl = await uploadLocalImageToFal(media.localPath);
        const { videoUrl, requestId } = await generateVeoClipFromImage({
          imageUrl,
          prompt: cinemaMotionPrompt(templateId, i),
          negativePrompt: cinemaNegative(templateId),
        });
        console.log(`[veo-reel] requestId ${requestId}`);

        const rawPath = path.join(
          workDir,
          `veo-raw-${String(i).padStart(3, "0")}.mp4`,
        );
        await downloadVeoVideoToFile(videoUrl, rawPath);

        const duration = await videoToClip(
          rawPath,
          clipPath,
          recipe,
          VEO_CLIP_SECONDS,
          0,
        );
        return { path: clipPath, duration };
      }),
    );

    const outputPath = path.join(workDir, "output.mp4");
    const transitionArg: string | string[] =
      edits?.transitions?.length === clips.length - 1
        ? edits.transitions
        : cinemaTransitions(templateId, Math.max(0, clips.length - 1));

    await concatWithXfade(
      clips,
      recipe.fadeSeconds,
      transitionArg,
      outputPath,
    );

    const masterPath = path.join(workDir, "output-master.mp4");
    const totalApprox = clips.reduce((s, c) => s + c.duration, 0);
    const fadeOutStart = Math.max(0.5, totalApprox - 0.6);
    await runFfmpeg([
      "-y",
      "-i",
      outputPath,
      "-vf",
      `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.55`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      masterPath,
    ]);

    const finalPath = path.join(workDir, "output-final.mp4");
    let layers: TextLayerEdit[] =
      edits?.textLayers?.length
        ? edits.textLayers
        : sanitizeEditText(edits?.text)
          ? [
              {
                content: sanitizeEditText(edits?.text),
                fontId: "playfair",
                start: 0.35,
                duration: Math.min(3.4, Math.max(2.2, totalApprox * 0.28)),
                x: 0.5,
                y: 0.78,
                scale: 1.12,
                color: "#F5F0E6",
                stroke: "dark",
              },
            ]
          : [];

    if (
      listing &&
      propertyHasContent(listing) &&
      !(edits?.textLayers && edits.textLayers.length)
    ) {
      layers = buildCinemaTextLayers(
        listing,
        clips.length,
        VEO_CLIP_SECONDS,
        recipe.fadeSeconds,
        templateId,
      );
    }

    if (layers.length) {
      await burnTextOverlays(masterPath, finalPath, layers);
    } else {
      await fs.copyFile(masterPath, finalPath);
    }

    return {
      final: await fs.readFile(finalPath),
      master: await fs.readFile(masterPath),
      durationSec: totalApprox,
      textLayers: layers,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

'''

p.write_text(t[:start] + new + t[end:], encoding="utf-8")
print("OK")
