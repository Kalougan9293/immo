import { fal } from "@fal-ai/client";
import { ensureFalCredentials } from "./fal";

/**
 * Moteur produit MVP : Veo 3.1 Fast I2V
 * Sans audio : 720p / 1080p ≈ $0.10/s → 4 s ≈ $0.40 / clip
 * 4–12 photos, toutes en Veo → ≈ $1.60 à $4.80 / reel
 */
export const VEO_I2V_MODEL =
  "fal-ai/veo3.1/fast/image-to-video" as const;

export const VEO_CLIP_DURATION = "4s" as const;
export const VEO_CLIP_SECONDS = 4;

/**
 * Fidélité photo — le mouvement caméra vient du brief showreel (`cinema.ts`).
 */
export const VEO_FIDELITY_PROMPT =
  "Animate ONLY this exact real-estate photograph. Do not invent, remove, morph or rearrange any architecture, furniture, decor, materials or proportions. Keep the real camera perspective of the still. Ultra-sharp photoreal luxury listing: crisp edges, true textures, clean reflections, light matching the source. If water, fire, plants or curtains already exist, add only subtle natural motion — never new objects. No people, no text, no watermark, no logo.";

export const VEO_NEGATIVE_PROMPT =
  "invented furniture, new objects, extra decor, missing furniture, morphing, melting walls, warped geometry, stretched rooms, camera shake, handheld, bobbing, wobble, jitter, motion smear, radial zoom blur, dutch angle, orbiting drone, smash zoom, sleepy static frame, soft mushy focus, low resolution, people, faces, text, watermark, logo, cartoon, flicker";

export type VeoI2VInput = {
  imageUrl: string;
  prompt?: string;
  negativePrompt?: string;
  duration?: "4s" | "6s" | "8s";
  generateAudio?: boolean;
  resolution?: "720p" | "1080p";
};

export type VeoI2VResult = {
  videoUrl: string;
  requestId: string;
};

/**
 * Photo → mini-clip cinéma (Veo 3.1 Fast @ 1080p par défaut).
 * Appel serveur uniquement — ne jamais exposer FAL_KEY au client.
 */
export async function generateVeoClipFromImage(
  input: VeoI2VInput,
): Promise<VeoI2VResult> {
  ensureFalCredentials();

  const result = await fal.subscribe(VEO_I2V_MODEL, {
    input: {
      image_url: input.imageUrl,
      prompt: input.prompt ?? VEO_FIDELITY_PROMPT,
      negative_prompt: input.negativePrompt ?? VEO_NEGATIVE_PROMPT,
      generate_audio: input.generateAudio ?? false,
      aspect_ratio: "9:16",
      duration: input.duration ?? VEO_CLIP_DURATION,
      // 1080p sans audio (~$0.10/s)
      resolution: input.resolution ?? "1080p",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        for (const log of update.logs) {
          console.log("[veo-fast]", log.message);
        }
      }
    },
  });

  const data = result.data as { video?: { url?: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) {
    throw new Error("Veo Fast n’a pas renvoyé d’URL vidéo.");
  }

  return { videoUrl, requestId: result.requestId };
}

/** Télécharge un MP4 Veo vers un chemin local (stream, pas tout en RAM). */
export async function downloadVeoVideoToFile(
  videoUrl: string,
  destPath: string,
): Promise<void> {
  const { createWriteStream } = await import("node:fs");
  const { pipeline } = await import("node:stream/promises");
  const { Readable } = await import("node:stream");
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Téléchargement Veo impossible (${res.status}).`);
  }
  if (!res.body) {
    throw new Error("Téléchargement Veo : corps vide.");
  }
  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    createWriteStream(destPath),
  );
}
