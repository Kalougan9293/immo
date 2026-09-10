import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { accessSync, constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveFfmpegPath } from "./ffmpeg-path";
import {
  getDurationPreset,
  getFont,
  sanitizeEditText,
  MIN_CLIP_SEC,
  MAX_CLIP_SEC,
  TEXT_FADE_SECONDS,
  DEFAULT_TEXT_ENTER,
  DEFAULT_TEXT_EXIT,
  type RenderEditOptions,
  type TextLayerEdit,
} from "./edit-options";
import { getRecipe, type RenderRecipe } from "./recipes";
import { MAX_MEDIAS_PER_VIDEO, MAX_USER_VIDEO_SEC } from "@/lib/media-limits";
import {
  MAX_VEO_PHOTOS_PER_REEL,
  TARGET_REEL_SECONDS,
  targetReelSecondsForCount,
} from "@/lib/product";
import {
  computeEqualClipDurations,
  veoApiDurationForSlot,
  veoApiSeconds,
} from "@/lib/render/reel-timing";
import {
  downloadVeoVideoToFile,
  generateVeoClipFromImage,
} from "@/lib/ai/veo";
import { uploadLocalImageToFal } from "@/lib/ai/fal";
import {
  buildCinemaTextLayers,
  cinemaMotionPrompt,
  cinemaNegative,
  cinemaTransitions,
  getCinemaStyle,
  applyCinemaTracking,
} from "@/lib/dynamic/cinema";
import {
  normalizeProperty,
  propertyHasContent,
  type PropertyListing,
} from "@/lib/dynamic/property";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
/** 1 Veo à la fois : l’instance Render 512 Mo ne tient pas 2 ffmpeg 1080p. */
const VEO_CLIP_CONCURRENCY = 1;

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const n = Math.min(Math.max(1, limit), Math.max(items.length, 1));
  if (!items.length) return results;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (true) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await fn(items[index], index);
      }
    }),
  );
  return results;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let bin: string;
    try {
      bin = resolveFfmpegPath();
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    const child = spawn(
      bin,
      ["-threads", "1", "-filter_complex_threads", "1", ...args],
      {
        windowsHide: true,
        env: { ...process.env, OMP_NUM_THREADS: "1" },
      },
    );
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-1200) || `FFmpeg exit ${code}`));
    });
  });
}

const X264_OUT = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-an",
] as const;

/** Remplit le cadre 9:16 sans bandes noires (comme les Reels d'exemple). */
function coverScale(): string {
  return (
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${WIDTH}:${HEIGHT},setsar=1`
  );
}

function gradeFilter(recipe: RenderRecipe): string {
  const { brightness, contrast, saturation } = recipe.grade;
  // Pas de vignette artificielle : les exemples sont ouverts et lumineux
  return (
    `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation},` +
    "setsar=1,format=yuv420p"
  );
}

/**
 * Ken Burns selon la signature du template (punch / crawl / slide…).
 */
function kenBurnsFilter(
  recipe: RenderRecipe,
  durationSec: number,
  direction: number,
): string {
  const frames = Math.max(1, Math.round(durationSec * FPS));
  const zMax = recipe.kenBurnsZoom;
  // Reach zoom peak earlier when zoomSpeed < 1 (fast punch)
  const ramp = Math.max(8, Math.round(frames * Math.min(1, Math.max(0.25, recipe.zoomSpeed))));

  let zExpr: string;
  let xExpr: string;
  let yExpr: string;

  const motion = recipe.motion;
  const alt = direction % 2;

  if (motion === "punch") {
    // Zoom agressif centré, atteint vite puis tient
    zExpr = `min(1+(${zMax}-1)*on/${ramp},${zMax})`;
    xExpr = "iw/2-(iw/zoom/2)";
    yExpr = "ih/2-(ih/zoom/2)";
  } else if (motion === "crawl") {
    // Quasi immobile — micro zoom
    zExpr = `min(1+(${zMax}-1)*on/${frames},${zMax})`;
    xExpr = "iw/2-(iw/zoom/2)";
    yExpr = "ih/2-(ih/zoom/2)";
  } else if (motion === "slide") {
    // Pans dominants, zoom léger fixe
    zExpr = String(Math.max(1.02, zMax * 0.98));
    if (alt === 0) {
      xExpr = `(iw-iw/zoom)*on/${frames}`;
      yExpr = "ih/2-(ih/zoom/2)";
    } else {
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = `(ih-ih/zoom)*on/${frames}`;
    }
  } else if (motion === "pulse") {
    // Alternance zoom in / zoom out marquée (plans courts)
    if (alt === 0) {
      zExpr = `min(1+(${zMax}-1)*on/${ramp},${zMax})`;
    } else {
      zExpr = `max(${zMax}-(${zMax}-1)*on/${ramp},1)`;
    }
    xExpr = "iw/2-(iw/zoom/2)";
    yExpr = "ih/2-(ih/zoom/2)";
  } else if (motion === "glide") {
    // Zoom progressif + léger pan diagonal
    zExpr = `min(1+(${zMax}-1)*on/${ramp},${zMax})`;
    xExpr = `(iw-iw/zoom)*on/${frames}*0.55`;
    yExpr = `(ih-ih/zoom)*on/${frames}*0.35`;
  } else if (motion === "rush") {
    // Sport : balayage latéral + micro-zoom continu (pas de pulse)
    const zRush = Math.min(zMax, 1.12);
    zExpr = `min(1+(${zRush}-1)*on/${frames},${zRush})`;
    if (alt === 0) {
      xExpr = `(iw-iw/zoom)*on/${frames}`;
      yExpr = "ih/2-(ih/zoom/2)";
    } else {
      xExpr = `(iw-iw/zoom)*(1-on/${frames})`;
      yExpr = "ih/2-(ih/zoom/2)";
    }
  } else if (motion === "sweep") {
    // One-shot / avance rapide : zoom fixe élevé, pan latéral net (pas de push-in)
    zExpr = String(Math.max(1.2, zMax));
    if (alt === 0) {
      xExpr = `(iw-iw/zoom)*on/${frames}`;
      yExpr = `(ih-ih/zoom)*0.35`;
    } else {
      xExpr = `(iw-iw/zoom)*(1-on/${frames})`;
      yExpr = `(ih-ih/zoom)*0.55`;
    }
  } else {
    // drift — zoom + pan alternés doux
    const mode = direction % 4;
    if (mode === 0) {
      zExpr = `min(1+(${zMax}-1)*on/${ramp},${zMax})`;
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (mode === 1) {
      zExpr = `max(${zMax}-(${zMax}-1)*on/${ramp},1)`;
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (mode === 2) {
      zExpr = String(zMax);
      xExpr = `(iw-iw/zoom)*on/${frames}`;
      yExpr = "ih/2-(ih/zoom/2)";
    } else {
      zExpr = String(zMax);
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = `(ih-ih/zoom)*on/${frames}`;
    }
  }

  const preScale =
    `scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase,` +
    `crop=${WIDTH * 2}:${HEIGHT * 2}`;

  return (
    `${preScale},` +
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},` +
    gradeFilter(recipe)
  );
}

async function imageToClip(
  input: string,
  output: string,
  recipe: RenderRecipe,
  index: number,
  durationSec: number,
): Promise<number> {
  const duration = Math.max(0.9, Math.min(TARGET_REEL_SECONDS + 0.5, durationSec));
  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    input,
    "-t",
    String(duration),
    "-vf",
    kenBurnsFilter(recipe, duration, index),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-an",
    output,
  ]);
  return duration;
}

/** Lit la durée source (ffmpeg -i, sans décodage). */
async function probeDurationSec(input: string): Promise<number | null> {
  return new Promise((resolve) => {
    let bin: string;
    try {
      bin = resolveFfmpegPath();
    } catch {
      resolve(null);
      return;
    }

    const child = spawn(bin, ["-hide_banner", "-i", input], {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) {
        resolve(null);
        return;
      }
      const sec =
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      resolve(Number.isFinite(sec) && sec > 0 ? sec : null);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish();
    }, 8000);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", finish);
    child.on("error", finish);
  });
}

async function videoToClip(
  input: string,
  output: string,
  recipe: RenderRecipe,
  durationSec: number,
  trimStartSec = 0,
): Promise<number> {
  const ss = Math.max(0, trimStartSec);
  const probed = await probeDurationSec(input);
  const remaining =
    probed != null ? Math.max(0.05, probed - ss) : durationSec;
  const duration = Math.max(
    MIN_CLIP_SEC,
    Math.min(MAX_CLIP_SEC, durationSec, remaining),
  );
  const vf =
    `${coverScale()},` +
    `fps=${FPS},` +
    gradeFilter(recipe);

  await runFfmpeg([
    "-y",
    ...(ss > 0.01 ? ["-ss", String(ss)] : []),
    "-i",
    input,
    "-t",
    String(duration),
    "-vf",
    vf,
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-an",
    output,
  ]);
  return duration;
}

/** Ralentit une source courte pour remplir la durée cible (ex. 1 video → 15 s). */
async function stretchVideoToClip(
  input: string,
  output: string,
  recipe: RenderRecipe,
  sourceSec: number,
  targetSec: number,
): Promise<number> {
  const src = Math.max(0.5, sourceSec);
  const target = Math.max(src, Math.min(TARGET_REEL_SECONDS + 0.5, targetSec));
  const factor = target / src;
  const vf =
    `setpts=${factor.toFixed(4)}*PTS,` +
    `${coverScale()},` +
    `fps=${FPS},` +
    gradeFilter(recipe);

  await runFfmpeg([
    "-y",
    "-i",
    input,
    "-t",
    String(target),
    "-vf",
    vf,
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-an",
    output,
  ]);
  return target;
}

function resolveFontCandidate(file: string): string | null {
  const candidates = path.isAbsolute(file)
    ? [file]
    : [path.join(process.cwd(), file), file];
  for (const candidate of candidates) {
    try {
      accessSync(candidate, fsConstants.R_OK);
      const abs = path.resolve(candidate);
      // Chemins relatifs sans `C:` — sinon FFmpeg casse fontfile sur Windows
      const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
      if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
        return rel;
      }
      return abs.replace(/\\/g, "/").replace(/:/g, "\\:");
    } catch {
      /* try next */
    }
  }
  return null;
}

function resolveDrawtextFont(fontId = "sans", italic = false): string | null {
  const font = getFont(fontId);
  const preferred =
    italic && font.italicFfmpegPaths?.length
      ? [...font.italicFfmpegPaths, ...font.ffmpegPaths]
      : font.ffmpegPaths;
  const candidates = [
    ...preferred,
    "public/fonts/SegoeUI-Bold.ttf",
    "public/fonts/Arial-Bold.ttf",
    "public/fonts/Georgia-Bold.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ];
  for (const file of candidates) {
    const resolved = resolveFontCandidate(file);
    if (resolved) return resolved;
  }
  return null;
}

/** Normalise le texte affiché (fichiers textfile drawtext). */
function normalizeOverlayText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02BC']/g, "\u2019")
    .replace(/€/g, "EUR")
    .replace(/\n/g, " ")
    .trim();
}

/** Échappe le texte pour le filtre drawtext FFmpeg (mode text). */
function escapeDrawtext(text: string): string {
  return normalizeOverlayText(text)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

const PIN_EMOJI_RE = /^[\u{1F4CD}\u{1F4CC}]\s*/u;

function stripPinEmoji(text: string): string {
  return text.replace(PIN_EMOJI_RE, "").trim();
}

function resolveBrandIcon(
  icon: TextLayerEdit["icon"] | undefined,
  content: string,
): { kind: "pin" | "whatsapp"; path: string } | null {
  const wantPin = icon === "pin" || PIN_EMOJI_RE.test(content);
  const wantWa =
    icon === "whatsapp" || /^whatsapp\b/i.test(content.trim());
  if (!wantPin && !wantWa) return null;
  const rel = wantWa ? "public/brand/whatsapp.png" : "public/brand/pin.png";
  const abs = path.join(process.cwd(), rel);
  try {
    accessSync(abs, fsConstants.R_OK);
    return { kind: wantWa ? "whatsapp" : "pin", path: abs };
  } catch {
    return null;
  }
}

async function burnTextOverlays(
  inputPath: string,
  outputPath: string,
  layers: TextLayerEdit[],
): Promise<void> {
  const valid = layers
    .map((l) => ({
      ...l,
      content: sanitizeEditText(l.content),
    }))
    .filter((l) => l.content || l.icon);

  if (!valid.length) {
    await fs.copyFile(inputPath, outputPath);
    return;
  }

  const iconInputs: string[] = [];
  const filterParts: string[] = [];
  let lastLabel = "[0:v]";
  let nextLabelIdx = 0;

  for (const layer of valid) {
    const start = Math.max(0, layer.start);
    const end = start + Math.max(0.2, layer.duration);
    const xN = Math.min(1, Math.max(0, layer.x));
    const yN = Math.min(1, Math.max(0, layer.y));
    const scale = Math.min(3.2, Math.max(0.45, layer.scale ?? 1));
    const fontsize = Math.round(64 * scale);
    const color = (layer.color || "#FFFFFF").replace("#", "");
    const stroke = layer.stroke ?? "dark";
    const shadow =
      stroke === "none"
        ? "shadowcolor=black@0.85:shadowx=3:shadowy=4:"
        : "shadowcolor=black@0.82:shadowx=3:shadowy=4:";
    const borderw =
      stroke === "none" ? 0 : Math.max(2, Math.round(2.35 * scale));
    const bordercolor =
      stroke === "light"
        ? "white@0.65"
        : stroke === "gold"
          ? "0xC4A574@0.9"
          : stroke === "dark"
            ? "black@0.72"
            : "black@0";
    const bg = layer.bg?.replace("#", "");
    const bgAlpha = Math.min(1, Math.max(0, layer.bgAlpha ?? 0));
    const boxPart =
      bg && bgAlpha > 0.02
        ? `box=1:boxcolor=0x${bg}@${bgAlpha.toFixed(2)}:boxborderw=${Math.round(22 * scale)}:`
        : "";
    const fadeMax = layer.fadeSec ?? TEXT_FADE_SECONDS;
    const fade = Math.min(fadeMax, (end - start) / 2);
    const enter = layer.enter ?? DEFAULT_TEXT_ENTER;
    const exit = layer.exit ?? DEFAULT_TEXT_EXIT;
    const s = start.toFixed(2);
    const e = end.toFixed(2);
    const f = fade.toFixed(2);
    let alphaExpr = "1";
    if (fade > 0.001 && (enter !== "none" || exit !== "none")) {
      const inPart =
        enter === "none"
          ? "1"
          : `if(lt(t\\,${s}+${f})\\,(t-${s})/${f}\\,1)`;
      const outPart =
        exit === "none"
          ? "1"
          : `if(gt(t\\,${e}-${f})\\,(${e}-t)/${f}\\,1)`;
      alphaExpr = `min(${inPart}\\,${outPart})`;
    }
    const enable = `between(t\\,${s}\\,${e})`;
    const risePx = Math.round(28 * scale);
    let textY = `h*${yN.toFixed(3)}-th/2`;
    if (fade > 0.001 && (enter === "rise" || exit === "fall")) {
      const enterOff =
        enter === "rise"
          ? `if(lt(t\\,${s}+${f})\\,${risePx}*(1-(t-${s})/${f})\\,0)`
          : "0";
      const exitOff =
        exit === "fall"
          ? `if(gt(t\\,${e}-${f})\\,${risePx}*(1-(${e}-t)/${f})\\,0)`
          : "0";
      textY = `h*${yN.toFixed(3)}-th/2+(${enterOff})+(${exitOff})`;
    }

    const brand = resolveBrandIcon(layer.icon, layer.content);
    let textContent =
      brand?.kind === "pin" ? stripPinEmoji(layer.content) : layer.content;
    if (brand?.kind === "whatsapp") {
      textContent = textContent.replace(/^whatsapp\s*/i, "").trim();
    }
    if (layer.look === "cinema" || layer.look === "cinema-meta") {
      textContent = applyCinemaTracking(textContent, layer.look);
    }
    textContent = escapeDrawtext(textContent);

    const font = resolveDrawtextFont(layer.fontId, layer.italic === true);
    const fontPart = font ? `fontfile=${font}:` : "";
    const iconPx = Math.round(fontsize * 0.88);
    const gap = Math.round(12 * scale);
    const estTextW = textContent
      ? Math.round(Math.max(48, textContent.length * fontsize * 0.5))
      : 0;
    const pairW = brand ? iconPx + gap + estTextW : estTextW;

    if (textContent) {
      const out = `v${nextLabelIdx++}`;
      const textX = brand
        ? `main_w*${xN.toFixed(3)}-${pairW}/2+${iconPx + gap}`
        : `w*${xN.toFixed(3)}-tw/2`;
      filterParts.push(
        `${lastLabel}drawtext=${fontPart}` +
          `text='${textContent}':` +
          `fontsize=${fontsize}:fontcolor=0x${color}:` +
          `borderw=${borderw}:bordercolor=${bordercolor}:` +
          shadow +
          boxPart +
          `x=${textX}:y=${textY}:` +
          `alpha='${alphaExpr}':` +
          `enable='${enable}'[${out}]`,
      );
      lastLabel = `[${out}]`;
    }

    if (brand) {
      const inputIdx = iconInputs.length + 1;
      iconInputs.push(brand.path);
      const scaled = `icon${inputIdx}`;
      const out = `v${nextLabelIdx++}`;
      const iconXFinal = `main_w*${xN.toFixed(3)}-${pairW}/2`;
      const iconY = `(main_h-${iconPx})*${yN.toFixed(3)}`;
      filterParts.push(
        `[${inputIdx}:v]scale=${iconPx}:${iconPx},format=rgba[${scaled}]`,
      );
      filterParts.push(
        `${lastLabel}[${scaled}]overlay=x='${iconXFinal}':y='${iconY}':` +
          `format=auto:eof_action=repeat:enable='${enable}'[${out}]`,
      );
      lastLabel = `[${out}]`;
    }
  }

  const args = ["-y", "-i", inputPath];
  for (const icon of iconInputs) {
    args.push("-i", icon);
  }
  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    lastLabel,
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
    outputPath,
  );

  await runFfmpeg(args);
}

async function imagesToTripleStripClip(
  inputs: [string, string, string],
  output: string,
  recipe: RenderRecipe,
): Promise<number> {
  const duration = recipe.tripleStripSeconds ?? 3.4;
  const bandH = Math.floor(HEIGHT / 3); // 640
  const frames = Math.max(1, Math.round(duration * FPS));

  // 3 bandes horizontales + filets fins luxe + léger zoom global
  const band = (label: string) =>
    `[${label}]scale=${WIDTH}:${bandH}:force_original_aspect_ratio=increase,` +
    `crop=${WIDTH}:${bandH},setsar=1[b${label}]`;

  const filter =
    `${band("0")};${band("1")};${band("2")};` +
    `[b0][b1][b2]vstack=inputs=3[stack];` +
    // Filets horizontaux discrets entre les bandes
    `[stack]drawbox=x=0:y=${bandH - 1}:w=${WIDTH}:h=2:color=white@0.55:t=fill,` +
    `drawbox=x=0:y=${bandH * 2 - 1}:w=${WIDTH}:h=2:color=white@0.55:t=fill[lined];` +
    `[lined]scale=${WIDTH * 2}:${HEIGHT * 2},` +
    `zoompan=z='min(1+0.08*on/${frames},1.08)':` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
    `d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},` +
    gradeFilter(recipe);

  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    String(duration),
    "-i",
    inputs[0],
    "-loop",
    "1",
    "-t",
    String(duration),
    "-i",
    inputs[1],
    "-loop",
    "1",
    "-t",
    String(duration),
    "-i",
    inputs[2],
    "-filter_complex",
    filter,
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-an",
    output,
  ]);

  return duration;
}

/**
 * Enchaîne les clips avec xfade (fondus croisés, éventuellement distincts).
 */
async function concatWithXfade(
  clips: { path: string; duration: number }[],
  fadeSeconds: number,
  transitionOrList: string | string[],
  outputPath: string,
): Promise<void> {
  if (clips.length === 1) {
    await fs.copyFile(clips[0].path, outputPath);
    return;
  }

  const defaultTransition = Array.isArray(transitionOrList)
    ? transitionOrList[0] || "fade"
    : transitionOrList;

  const fade = Math.min(
    fadeSeconds,
    ...clips.map((c) => Math.max(0.15, c.duration * 0.35)),
  );

  const workDir = path.dirname(outputPath);
  let currentPath = clips[0].path;
  let currentDuration = clips[0].duration;

  // 2 clips à la fois — un seul graphe xfade 12×1080p explose la RAM Render.
  for (let i = 1; i < clips.length; i++) {
    const isLast = i === clips.length - 1;
    const outPath = isLast
      ? outputPath
      : path.join(workDir, `xfade-${String(i).padStart(3, "0")}.mp4`);
    const offset = Math.max(0, currentDuration - fade);
    const transition = Array.isArray(transitionOrList)
      ? transitionOrList[i - 1] || defaultTransition
      : defaultTransition;

    await runFfmpeg([
      "-y",
      "-i",
      currentPath,
      "-i",
      clips[i].path,
      "-filter_complex",
      `[0:v][1:v]xfade=transition=${transition}:duration=${fade}:offset=${offset}[vout]`,
      "-map",
      "[vout]",
      ...X264_OUT,
      "-movflags",
      "+faststart",
      outPath,
    ]);

    currentDuration = offset + clips[i].duration;
    currentPath = outPath;
  }
}

export type LocalMediaInput = {
  localPath: string;
  kind: "image" | "video" | "other";
};

export async function buildSlideshowMp4(
  medias: LocalMediaInput[],
  templateId = "appartement-premium",
  edits?: RenderEditOptions,
): Promise<Buffer> {
  if (!medias.length) {
    throw new Error("Aucun média à monter.");
  }

  const base = getRecipe(templateId);
  const preset = getDurationPreset(edits?.durationPreset);
  const recipe: RenderRecipe = {
    ...base,
    imageSeconds: Math.round(base.imageSeconds * preset.imageScale * 100) / 100,
    videoMaxSeconds:
      Math.round(base.videoMaxSeconds * preset.videoScale * 100) / 100,
    fadeSeconds: Math.round(base.fadeSeconds * preset.fadeScale * 100) / 100,
    transition: edits?.transition || base.transition,
    // Strip auto (3 premières images) sauf désactivation explicite
    tripleStrip: edits?.disableTripleStrip === true ? false : Boolean(base.tripleStrip),
  };

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "areo-render-"));
  const clips: { path: string; duration: number }[] = [];

  try {
    const limited = (
      base.singleShot ? medias.slice(0, 1) : medias
    ).slice(0, MAX_MEDIAS_PER_VIDEO);
    const imagePaths = limited
      .filter((m) => m.kind !== "video")
      .map((m) => m.localPath);

    for (let i = 0; i < limited.length; i++) {
      const media = limited[i];
      const clipPath = path.join(
        workDir,
        `clip-${String(i).padStart(3, "0")}.mp4`,
      );

      const overrideDuration = edits?.clipDurations?.[i];
      const trimStart = edits?.clipTrimStarts?.[i] ?? 0;
      let duration: number;
      if (media.kind === "video") {
        duration = await videoToClip(
          media.localPath,
          clipPath,
          recipe,
          overrideDuration ?? MAX_USER_VIDEO_SEC,
          trimStart,
        );
      } else {
        duration = await imageToClip(
          media.localPath,
          clipPath,
          recipe,
          i,
          overrideDuration ?? recipe.imageSeconds,
        );
      }
      clips.push({ path: clipPath, duration });
    }

    // Ouverture auto : collage 3 bandes avec les 3 premières images
    let stripDuration = 0;
    if (recipe.tripleStrip && imagePaths.length >= 3) {
      const stripPath = path.join(workDir, "clip-triple-strip.mp4");
      stripDuration = await imagesToTripleStripClip(
        [imagePaths[0], imagePaths[1], imagePaths[2]],
        stripPath,
        recipe,
      );
      clips.unshift({ path: stripPath, duration: stripDuration });
    }

    const outputPath = path.join(workDir, "output.mp4");
    let transitionArg: string | string[] = recipe.transition;
    if (edits?.transitions?.length) {
      if (
        stripDuration > 0 &&
        edits.transitions.length === clips.length - 2
      ) {
        // Timeline user + jointure strip → 1er clip
        transitionArg = [recipe.transition, ...edits.transitions];
      } else if (edits.transitions.length === clips.length - 1) {
        transitionArg = edits.transitions;
      }
    }

    await concatWithXfade(
      clips,
      recipe.fadeSeconds,
      transitionArg,
      outputPath,
    );

    const fadedPath = path.join(workDir, "output-faded.mp4");
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
      fadedPath,
    ]);

    const finalPath = path.join(workDir, "output-final.mp4");
    const rawLayers: TextLayerEdit[] =
      edits?.textLayers?.length
        ? edits.textLayers
        : sanitizeEditText(edits?.text)
          ? [
              {
                content: sanitizeEditText(edits?.text),
                fontId: "sans",
                start: 0.35,
                duration: Math.min(3.4, Math.max(2.2, totalApprox * 0.28)),
                x: 0.5,
                y: 0.82,
              },
            ]
          : [];

    // Textes timeline alignés après le strip d’ouverture
    const layers =
      stripDuration > 0
        ? rawLayers.map((l) => ({ ...l, start: l.start + stripDuration }))
        : rawLayers;

    if (layers.length) {
      await burnTextOverlays(fadedPath, finalPath, layers);
    } else {
      await fs.copyFile(fadedPath, finalPath);
    }

    return await fs.readFile(finalPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Photos → Veo 3.1 Lite → xfade. Fichiers sur disque (pas de Buffer) pour Render 512 Mo.
 */
export type VeoReelBuildResult = {
  finalPath: string;
  masterPath: string;
  durationSec: number;
  textLayers: TextLayerEdit[];
  cleanup: () => Promise<void>;
};

export async function buildVeoReelMp4(
  medias: LocalMediaInput[],
  templateId = "appartement-premium",
  edits?: RenderEditOptions,
  property?: PropertyListing | null,
  onProgress?: (info: {
    phase: "veo" | "assemble";
    current: number;
    total: number;
  }) => void,
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

    const reelTarget = targetReelSecondsForCount(
      limited.length,
      recipe.fadeSeconds,
    );
    const slotDurations = computeEqualClipDurations(
      limited.length,
      recipe.fadeSeconds,
      reelTarget,
    );

    // Photos Veo en parallèle (plafond coût), reste = Ken Burns
    let veoBudget = MAX_VEO_PHOTOS_PER_REEL;
    const plan = limited.map((media, i) => {
      const slot = slotDurations[i] ?? 2;
      if (media.kind === "video") {
        return { media, i, slot, engine: "video" as const };
      }
      if (veoBudget > 0) {
        veoBudget -= 1;
        return { media, i, slot, engine: "veo" as const };
      }
      return { media, i, slot, engine: "kenburns" as const };
    });

    let veoDone = 0;
    const clips = await mapLimit(
      plan,
      VEO_CLIP_CONCURRENCY,
      async ({ media, i, slot, engine }) => {
        try {
          const clipPath = path.join(
            workDir,
            `clip-${String(i).padStart(3, "0")}.mp4`,
          );

          if (engine === "video") {
            const overrideDuration = edits?.clipDurations?.[i];
            const trimStart = edits?.clipTrimStarts?.[i] ?? 0;
            const duration = await videoToClip(
              media.localPath,
              clipPath,
              recipe,
              overrideDuration ??
                Math.min(slot, MAX_USER_VIDEO_SEC, TARGET_REEL_SECONDS),
              trimStart,
            );
            return { path: clipPath, duration };
          }

          if (engine === "kenburns") {
            console.log(
              `[veo-reel] clip ${i + 1}/${limited.length} — Ken Burns (${slot.toFixed(1)}s)…`,
            );
            const duration = await imageToClip(
              media.localPath,
              clipPath,
              recipe,
              i,
              edits?.clipDurations?.[i] ?? slot,
            );
            return { path: clipPath, duration };
          }

          const apiDur = veoApiDurationForSlot(slot);
          const apiSec = veoApiSeconds(apiDur);
          console.log(
            `[veo-reel] clip ${i + 1}/${limited.length} — Veo Lite ${apiDur} → ${slot.toFixed(1)}s…`,
          );
          const imageUrl = await uploadLocalImageToFal(media.localPath);
          const { videoUrl, requestId } = await generateVeoClipFromImage({
            imageUrl,
            prompt: cinemaMotionPrompt(templateId, i, limited.length),
            negativePrompt: cinemaNegative(templateId),
            duration: apiDur,
          });
          console.log(`[veo-reel] requestId ${requestId}`);

          const rawPath = path.join(
            workDir,
            `veo-raw-${String(i).padStart(3, "0")}.mp4`,
          );
          await downloadVeoVideoToFile(videoUrl, rawPath);

          const targetSec = edits?.clipDurations?.[i] ?? slot;
          const duration =
            targetSec > apiSec + 0.2
              ? await stretchVideoToClip(
                  rawPath,
                  clipPath,
                  recipe,
                  apiSec,
                  targetSec,
                )
              : await videoToClip(
                  rawPath,
                  clipPath,
                  recipe,
                  Math.min(targetSec, apiSec),
                  0,
                );
          return { path: clipPath, duration };
        } finally {
          veoDone += 1;
          onProgress?.({
            phase: "veo",
            current: veoDone,
            total: plan.length,
          });
        }
      },
    );

    onProgress?.({ phase: "assemble", current: 1, total: 1 });

    const outputPath = path.join(workDir, "output.mp4");
    const transitionArg: string | string[] =
      edits?.transitions?.length === clips.length - 1
        ? edits.transitions
        : cinemaTransitions(
            templateId,
            Math.max(0, clips.length - 1),
            limited.length,
          );

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
        clips[0]?.duration ?? 4,
        recipe.fadeSeconds,
        templateId,
        edits?.writingStyleId,
        clips.map((c) => c.duration),
      );
    }

    if (layers.length) {
      await burnTextOverlays(masterPath, finalPath, layers);
    } else {
      await fs.copyFile(masterPath, finalPath);
    }

    return {
      finalPath,
      masterPath,
      durationSec: totalApprox,
      textLayers: layers,
      cleanup: async () => {
        await fs
          .rm(workDir, { recursive: true, force: true })
          .catch(() => undefined);
      },
    };
  } catch (e) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    throw e;
  }
}

export function renderFolderFromMediaPath(mediaPath: string): string {
  if (mediaPath.startsWith("guest/")) {
    const parts = mediaPath.split("/");
    return `${parts[0]}/${parts[1]}/renders`;
  }
  const userId = mediaPath.split("/")[0];
  return `${userId}/renders`;
}
