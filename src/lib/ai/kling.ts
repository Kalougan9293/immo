import { fal } from "@fal-ai/client";
import { ensureFalCredentials } from "./fal";

/** Kling V3 Standard I2V — scripts lab uniquement (produit = Veo Fast). */
export const KLING_I2V_MODEL =
  "fal-ai/kling-video/v3/standard/image-to-video" as const;

export const DEFAULT_INTERIOR_MOTION_PROMPT =
  "Locked-off cinematic push-in on a tripod slider, extremely smooth constant speed, rock-steady luxury real estate interior, no handheld shake, no wobble, no bobbing, gimbal locked, photorealistic architecture, natural daylight, subtle depth parallax only, no text, no watermark, no people";

export const DEFAULT_NEGATIVE_PROMPT =
  "camera shake, handheld, wobble, bobbing, limping, jitter, unstable, blur, distort, warped walls, melting furniture, low quality, text, watermark, logo, cartoon, morphing";

export type KlingI2VInput = {
  /** URL publique ou data URI de la photo de départ */
  imageUrl: string;
  prompt?: string;
  negativePrompt?: string;
  /** Secondes : 3–15 (string côté API fal) */
  durationSec?: 3 | 4 | 5 | 6 | 7 | 8;
  /** Audio natif Kling — off par défaut (coût + contrôle) */
  generateAudio?: boolean;
};

export type KlingI2VResult = {
  videoUrl: string;
  requestId: string;
};

/**
 * Photo → mini-clip cinéma (image-to-video).
 * Appel serveur uniquement — ne jamais exposer FAL_KEY au client.
 */
export async function generateKlingClipFromImage(
  input: KlingI2VInput,
): Promise<KlingI2VResult> {
  ensureFalCredentials();

  const duration = String(input.durationSec ?? 5) as
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "11"
    | "12"
    | "13"
    | "14"
    | "15";
  const result = await fal.subscribe(KLING_I2V_MODEL, {
    input: {
      start_image_url: input.imageUrl,
      prompt: input.prompt ?? DEFAULT_INTERIOR_MOTION_PROMPT,
      negative_prompt: input.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT,
      duration,
      generate_audio: input.generateAudio ?? false,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        for (const log of update.logs) {
          console.log("[kling]", log.message);
        }
      }
    },
  });

  const data = result.data as { video?: { url?: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) {
    throw new Error("Kling n’a pas renvoyé d’URL vidéo.");
  }

  return { videoUrl, requestId: result.requestId };
}
