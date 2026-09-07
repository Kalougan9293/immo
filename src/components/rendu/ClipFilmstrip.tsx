"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineClip } from "@/lib/render/edit-options";

const TILE = 48;

type ClipFilmstripProps = {
  clip: TimelineClip;
  width: number;
  height: number;
};

/** Remplit le plan (pas de vide) : image répétée ou frames vidéo. */
export function ClipFilmstrip({ clip, width, height }: ClipFilmstripProps) {
  const count = Math.max(1, Math.ceil(width / TILE));
  const trimStart = clip.trimStart ?? 0;

  const videoFrames = useVideoFilmstrip(
    clip.kind === "video" ? clip.previewUrl : undefined,
    clip.duration,
    trimStart,
    count,
  );

  if (!clip.previewUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1c] text-[10px] text-muted">
        —
      </div>
    );
  }

  if (clip.kind === "video") {
    return (
      <div className="absolute inset-0 flex overflow-hidden bg-black">
        {Array.from({ length: count }).map((_, i) => {
          const src = videoFrames[i] || videoFrames[0] || null;
          return src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              draggable={false}
              className="h-full shrink-0 object-cover"
              style={{ width: TILE }}
            />
          ) : (
            <div
              key={i}
              className="h-full shrink-0 animate-pulse bg-[#222]"
              style={{ width: TILE }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-black">
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={clip.previewUrl}
          alt=""
          draggable={false}
          className="h-full shrink-0 object-cover"
          style={{ width: TILE, height }}
        />
      ))}
    </div>
  );
}

function useVideoFilmstrip(
  url: string | undefined,
  duration: number,
  trimStart: number,
  count: number,
) {
  const [frames, setFrames] = useState<string[]>([]);
  const key = useMemo(
    () => `${url}|${duration}|${trimStart}|${count}`,
    [url, duration, trimStart, count],
  );

  useEffect(() => {
    if (!url || count < 1) {
      setFrames([]);
      return;
    }

    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = url;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const capture = async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error("video"));
        });
        if (cancelled || !ctx) return;

        const vw = video.videoWidth || 320;
        const vh = video.videoHeight || 180;
        canvas.width = TILE * 2;
        canvas.height = Math.round((TILE * 2 * vh) / vw);

        const out: string[] = [];
        const span = Math.max(0.05, duration);
        for (let i = 0; i < count; i++) {
          if (cancelled) return;
          const t =
            trimStart +
            (count === 1 ? span * 0.15 : (i / Math.max(1, count - 1)) * span * 0.92);
          await seek(video, t);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          out.push(canvas.toDataURL("image/jpeg", 0.62));
          setFrames([...out]);
        }
      } catch {
        if (!cancelled) setFrames([]);
      }
    };

    void capture();
    return () => {
      cancelled = true;
      video.src = "";
      video.load();
    };
  }, [key, url, duration, trimStart, count]);

  return frames;
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = Math.max(0, Math.min(time, (video.duration || time) - 0.05));
    } catch {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }
  });
}
