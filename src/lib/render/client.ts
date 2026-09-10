export type RenderApiResult = {
  signedUrl: string;
  storagePath: string;
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

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      "Connexion coupée pendant la génération. Réessaie dans un instant.",
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Réponse serveur invalide. Réessaie.");
  }
}

function asResult(data: Record<string, unknown>): RenderApiResult | null {
  if (
    typeof data.signedUrl === "string" &&
    typeof data.storagePath === "string"
  ) {
    return data as unknown as RenderApiResult;
  }
  return null;
}

/**
 * POST démarre le job (réponse immédiate) puis poll jusqu’au résultat.
 * Évite le timeout HTTP Render sur les générations Veo (plusieurs minutes).
 */
export async function runRenderApi(
  body: unknown,
  onTick?: (info: { progress?: number; statusLabel?: string }) => void,
): Promise<RenderApiResult> {
  const startRes = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const start = await parseJson(startRes);

  const immediate = asResult(start);
  if (immediate) {
    if (!startRes.ok) {
      throw new Error(
        typeof start.error === "string" ? start.error : "Échec de la génération.",
      );
    }
    return immediate;
  }

  if (!startRes.ok && typeof start.jobId !== "string") {
    throw new Error(
      typeof start.error === "string" ? start.error : "Échec de la génération.",
    );
  }

  const jobId = typeof start.jobId === "string" ? start.jobId : null;
  if (!jobId) {
    throw new Error(
      typeof start.error === "string"
        ? start.error
        : "Job de génération introuvable.",
    );
  }

  const started = Date.now();
  const maxMs = 15 * 60 * 1000;

  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`/api/render?job=${encodeURIComponent(jobId)}`);
    const data = await parseJson(pollRes);

    if (typeof data.progress === "number" || typeof data.statusLabel === "string") {
      onTick?.({
        progress:
          typeof data.progress === "number" ? data.progress : undefined,
        statusLabel:
          typeof data.statusLabel === "string" ? data.statusLabel : undefined,
      });
    }

    if (data.status === "done") {
      const result = asResult(data);
      if (!result) throw new Error("URL vidéo manquante.");
      return result;
    }

    if (data.status === "error" || (data.status !== "running" && !pollRes.ok)) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Échec de la génération.",
      );
    }
  }

  throw new Error("Génération trop longue. Réessaie.");
}
