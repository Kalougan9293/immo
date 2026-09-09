import { fal } from "@fal-ai/client";
import { ensureFalCredentials } from "./fal";

/** Moteur produit validé : Veo 3.1 Fast I2V (~$0.10/s sans audio). */
export const VEO_I2V_MODEL =
  "fal-ai/veo3.1/fast/image-to-video" as const;

export const VEO_CLIP_DURATION = "4s" as const;
export const VEO_CLIP_SECONDS = 4;

/** Fidélité max : animer la photo, ne rien inventer. */
export const VEO_FIDELITY_PROMPT =
  "Animate ONLY the provided real-estate photo. Strictly preserve the exact room layout, furniture, decor, materials, colors, and architecture — do not add, remove, replace, invent, or rearrange any objects, furniture, plants, art, or people. Locked-off cinematic slow push-in on a tripod slider, extremely smooth constant speed, rock-steady, subtle depth parallax only. Photorealistic, natural daylight matching the source image. No text, no watermark.";

export const VEO_NEGATIVE_PROMPT =
  "invented furniture, new objects, extra decor, morphing, melting walls, warped geometry, camera shake, handheld, wobble, people, text, watermark, logo, cartoon";

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
 * Photo → mini-clip cinéma (Veo 3.1 Fast).
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
          console.log("[veo]", log.message);
        }
      }
    },
  });

  const data = result.data as { video?: { url?: string } };
  const videoUrl = data.video?.url;
  if (!videoUrl) {
    throw new Error("Veo n’a pas renvoyé d’URL vidéo.");
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
