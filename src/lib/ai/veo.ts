import { fal } from "@fal-ai/client";
import { ensureFalCredentials } from "./fal";

/**
 * Moteur produit MVP : Veo 3.1 Lite I2V
 * ~$0.03/s @ 720p sans audio → 4 photos ≈ $0.48 | 12 ≈ $1.44
 */
export const VEO_I2V_MODEL =
  "fal-ai/veo3.1/lite/image-to-video" as const;

export const VEO_CLIP_DURATION = "4s" as const;
export const VEO_CLIP_SECONDS = 4;

/**
 * Prompt Lite : fidélité stricte + mouvement minimal stable
 * (Lite invente plus facilement — on verrouille fort).
 */
export const VEO_FIDELITY_PROMPT =
  "Animate ONLY this exact real-estate photograph. Preserve every object, wall, floor, ceiling, window, furniture piece, material, color, and proportion with pixel-level fidelity — do not invent, remove, duplicate, morph, or rearrange anything. Locked tripod, rock-steady, ultra-smooth constant-speed cinematic push-in (or subtle lateral glide), no handheld, no shake, no zoom jump, no dolly crash. Natural daylight matching the source. Photoreal luxury listing look. No people, no text, no watermark, no logo.";

export const VEO_NEGATIVE_PROMPT =
  "invented furniture, new objects, extra decor, missing furniture, morphing, melting walls, warped geometry, stretched rooms, camera shake, handheld, wobble, jitter, abrupt zoom, people, faces, text, watermark, logo, cartoon, low quality, flicker";

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
 * Photo → mini-clip cinéma (Veo 3.1 Lite @ 720p).
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
      resolution: input.resolution ?? "720p",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        for (const log of update.logs) {
          console.log("[veo-lite]", log.message);
        }
      }
    },
  });

  const data = result.data as { video?: { url?: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) {
    throw new Error("Veo Lite n’a pas renvoyé d’URL vidéo.");
  }

  return { videoUrl, requestId: result.requestId };
}

/** Télécharge un MP4 Veo vers un chemin local. */
export async function downloadVeoVideoToFile(
  videoUrl: string,
  destPath: string,
): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Téléchargement Veo impossible (${res.status}).`);
  }
  await writeFile(destPath, Buffer.from(await res.arrayBuffer()));
}
