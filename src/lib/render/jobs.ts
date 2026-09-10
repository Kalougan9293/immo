export type RenderJobStatus = "running" | "done" | "error";

export type RenderJobResult = {
  ok: true;
  engine: string;
  mode: string;
  status: "ready";
  storagePath: string;
  signedUrl: string;
  masterStoragePath: string | null;
  masterSignedUrl: string | null;
  textLayers: unknown[];
  durationSec: number | null;
  coverPath: string | null;
  coverUrl: string | null;
  saved: boolean;
  savedVideoId: string | null;
  evicted: number;
};

export type RenderJob = {
  id: string;
  status: RenderJobStatus;
  progress: number;
  statusLabel: string;
  error?: string;
  result?: RenderJobResult;
  createdAt: number;
};

const jobs = new Map<string, RenderJob>();
const TTL_MS = 45 * 60 * 1000;

function gc() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) jobs.delete(id);
  }
}

export function createRenderJob(): RenderJob {
  gc();
  const job: RenderJob = {
    id: crypto.randomUUID(),
    status: "running",
    progress: 4,
    statusLabel: "Préparation",
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getRenderJob(id: string): RenderJob | undefined {
  gc();
  return jobs.get(id);
}

export function patchRenderJob(id: string, patch: Partial<RenderJob>) {
  const job = jobs.get(id);
  if (!job || job.status !== "running") return;
  Object.assign(job, patch);
}

export function finishRenderJob(id: string, result: RenderJobResult) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "done";
  job.progress = 100;
  job.statusLabel = "Finalisation";
  job.result = result;
}

export function failRenderJob(id: string, error: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "error";
  job.error = error;
}
