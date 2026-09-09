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
  type RenderEditOptions,
  type TextLayerEdit,
} from "./edit-options";
import { getRecipe, type RenderRecipe } from "./recipes";
import { MAX_MEDIAS_PER_VIDEO } from "@/lib/media-limits";
import {
  downloadVeoVideoToFile,
  generateVeoClipFromImage,
  VEO_CLIP_SECONDS,
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

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let bin: string;
    try {
      bin = resolveFfmpegPath();
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }

    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-1200) || `FFmpeg exit ${code}`));
    });
  });
}

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
  const duration = Math.max(1.1, Math.min(8, durationSec));
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

async function videoToClip(
  input: string,
  output: string,
  recipe: RenderRecipe,
  durationSec: number,
  trimStartSec = 0,
): Promise<number> {
  const duration = Math.max(
    MIN_CLIP_SEC,
    Math.min(MAX_CLIP_SEC, durationSec),
  );
  const ss = Math.max(0, trimStartSec);
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

function resolveDrawtextFont(fontId = "sans"): string | null {
  const font = getFont(fontId);
  const candidates = [
    ...font.ffmpegPaths,
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
    const alphaExpr =
      fade > 0.001
        ? `if(lt(t\\,${start.toFixed(2)}+${fade.toFixed(2)})\\,(t-${start.toFixed(2)})/${fade.toFixed(2)}\\,if(gt(t\\,${end.toFixed(2)}-${fade.toFixed(2)})\\,(${end.toFixed(2)}-t)/${fade.toFixed(2)}\\,1))`
        : "1";
    const enable = `between(t\\,${start.toFixed(2)}\\,${end.toFixed(2)})`;
    // Éviter "text_h" / "text_w" comme noms d’options mal parsés
    const textY = `h*${yN.toFixed(3)}-th/2`;

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

    const font = resolveDrawtextFont(layer.fontId);
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

  const inputs: string[] = [];
  for (const clip of clips) {
    inputs.push("-i", clip.path);
  }

  const filterParts: string[] = [];
  let lastLabel = "0:v";
  let timeline = clips[0].duration;

  for (let i = 1; i < clips.length; i++) {
    const outLabel = i === clips.length - 1 ? "vout" : `v${i}`;
    const offset = Math.max(0, timeline - fade);
    const transition = Array.isArray(transitionOrList)
      ? transitionOrList[i - 1] || defaultTransition
      : defaultTransition;
    filterParts.push(
      `[${lastLabel}][${i}:v]xfade=transition=${transition}:duration=${fade}:offset=${offset}[${outLabel}]`,
    );
    lastLabel = outLabel;
    timeline = offset + clips[i].duration;
  }

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[vout]",
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
  ]);
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
          overrideDuration ?? recipe.videoMaxSeconds,
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

export function renderFolderFromMediaPath(mediaPath: string): string {
  if (mediaPath.startsWith("guest/")) {
    const parts = mediaPath.split("/");
    return `${parts[0]}/${parts[1]}/renders`;
  }
  const userId = mediaPath.split("/")[0];
  return `${userId}/renders`;
}
