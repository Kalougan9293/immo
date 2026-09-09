/**
 * Remplace demos Dynamic 3-6 par refs Downloads (9:16 mute).
 * Usage: npx tsx scripts/import-ref-demos.ts
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DOWNLOADS = "d:\\Downloads";
const OUT = path.join(ROOT, "public", "templates", "demos");
const COVERS = path.join(ROOT, "public", "templates");
const FF = path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");

function pick(pred: (f: string) => boolean): string {
  const files = fs.readdirSync(DOWNLOADS).filter((f) =>
    f.toLowerCase().endsWith(".mp4"),
  );
  const f = files.find(pred);
  if (!f) throw new Error(`Fichier introuvable: ${pred}`);
  return path.join(DOWNLOADS, f);
}

const jobs = [
  {
    id: "dynamic-marina",
    file: "dynamic-marina-v9.mp4",
    src: pick((f) => f.startsWith("Magnifique_Maintenant")),
    cover: "dynamic-marina-v9.jpg",
  },
  {
    id: "dynamic-warm",
    file: "dynamic-warm-v9.mp4",
    src: pick((f) => f.startsWith("Magnifique_La_")),
    cover: "dynamic-warm-v9.jpg",
  },
];

for (const job of jobs) {
  const dest = path.join(OUT, job.file);
  console.log(`-> ${job.id} <- ${path.basename(job.src)}`);
  const vf =
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1";
  const r = spawnSync(
    FF,
    [
      "-y",
      "-i",
      job.src,
      "-vf",
      vf,
      "-r",
      "24",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      dest,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-1000));
    throw new Error(`ffmpeg failed ${job.id}`);
  }

  const coverPath = path.join(COVERS, job.cover);
  const coverTmp = path.join(OUT, `${job.id}-cover-tmp.jpg`);
  const c = spawnSync(
    FF,
    [
      "-y",
      "-ss",
      "1.5",
      "-i",
      dest,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-update",
      "1",
      coverTmp,
    ],
    { encoding: "utf8" },
  );
  if (c.status !== 0) {
    console.error(c.stderr?.slice(-600));
    throw new Error(`cover failed ${job.id}`);
  }
  fs.copyFileSync(coverTmp, coverPath);
  fs.unlinkSync(coverTmp);

  const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
  console.log(`  OK ${job.file} (${mb} MB) + ${job.cover}`);
}

console.log("Dynamic demos 3-6 remplacees (fichiers *-v9).");
