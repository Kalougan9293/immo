import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";

/**
 * Next/Turbopack peut corrompre __dirname de ffmpeg-static en `\ROOT\...`.
 * On résout un chemin réel, avec fallback sur process.cwd().
 */
export function resolveFfmpegPath(): string {
  const fromEnv = process.env.FFMPEG_PATH || process.env.FFMPEG_BIN;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;

  const binary = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", binary),
    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      "bin",
      binary,
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `FFmpeg introuvable. Chemin paquet: ${ffmpegStatic ?? "null"}. ` +
      `cwd: ${process.cwd()}`,
  );
}
