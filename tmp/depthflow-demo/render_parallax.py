"""Lab : Ken Burns 2D vs parallaxe 2.5D (Depth Anything)."""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(r"D:\Desktop\IMMO")
DIR = ROOT / "tmp" / "depthflow-demo"
FFMPEG = ROOT / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
FONT = r"C:\Windows\Fonts\arial.ttf"

W, H = 1080, 1920
FPS = 30
SHOT_SEC = 2.4
FRAMES = int(SHOT_SEC * FPS)
BASE_ZOOM = 1.14  # cache les bords (disocclusion)


def ease(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)


def cover_916(img: np.ndarray) -> np.ndarray:
    ih, iw = img.shape[:2]
    scale = max(W / iw, H / ih)
    nw, nh = int(round(iw * scale)), int(round(ih * scale))
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    x = max(0, (nw - W) // 2)
    y = max(0, (nh - H) // 2)
    crop = resized[y : y + H, x : x + W]
    if crop.shape[0] != H or crop.shape[1] != W:
        crop = cv2.resize(crop, (W, H), interpolation=cv2.INTER_AREA)
    return crop


def load_depth(path: Path, shape: tuple[int, int]) -> np.ndarray:
    raw = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if raw is None:
        raise FileNotFoundError(path)
    if raw.ndim == 3:
        gray = cv2.cvtColor(raw, cv2.COLOR_BGR2GRAY)
    else:
        gray = raw
    gray = cover_916(gray)
    d = gray.astype(np.float32) / 255.0
    lo, hi = np.percentile(d, (4, 96))
    d = np.clip((d - lo) / max(1e-5, hi - lo), 0, 1).astype(np.float32)
    d = cv2.bilateralFilter(d, d=7, sigmaColor=0.12, sigmaSpace=9)
    # Depth Anything : clair = proche en général. Si le centre est plus sombre
    # que les bords (couloir), on inverse.
    h, w = d.shape
    cy0, cy1 = int(h * 0.35), int(h * 0.7)
    cx0, cx1 = int(w * 0.3), int(w * 0.7)
    center = float(d[cy0:cy1, cx0:cx1].mean())
    border = float(
        np.concatenate(
            [d[:80, :].ravel(), d[-80:, :].ravel(), d[:, :60].ravel(), d[:, -60:].ravel()]
        ).mean()
    )
    # Pour un intérieur, le premier plan (bas / bords de porte) est souvent plus proche.
    # Si le centre (fond de pièce) est plus "proche" que les bords, on inverse.
    if center > border + 0.08:
        d = 1.0 - d
        print(f"  invert depth ({path.name}: center={center:.2f} border={border:.2f})")
    return d


def grid() -> tuple[np.ndarray, np.ndarray]:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return xx, yy


XX, YY = grid()
CX = (W - 1) / 2.0
CY = (H - 1) / 2.0


def remap(rgb: np.ndarray, map_x: np.ndarray, map_y: np.ndarray) -> np.ndarray:
    return cv2.remap(
        rgb,
        map_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101,
    )


def ken_burns_frame(rgb: np.ndarray, t: float) -> np.ndarray:
    u = ease(t)
    zoom = BASE_ZOOM + 0.10 * u
    map_x = CX + (XX - CX) / zoom
    map_y = CY + (YY - CY) / zoom
    return remap(rgb, map_x, map_y)


def parallax_frame(rgb: np.ndarray, depth: np.ndarray, t: float) -> np.ndarray:
    """Orbit + dolly : le proche bouge plus que le fond (look LeiaPix)."""
    u = ease(t)
    # pendulum horizontal + léger lift, push vers l'intérieur
    yaw = math.sin((u - 0.5) * math.pi) * 0.95
    pitch = (0.5 - abs(u - 0.5)) * 0.32
    dolly = 0.08 * u

    # d=1 proche. Pivot ~0.22 : le fond recule, le cadre avance.
    d = depth
    pivot = 0.22
    disp = d - pivot

    zoom = BASE_ZOOM + dolly * (0.45 + 1.15 * d)
    tx = yaw * 72.0 * disp
    ty = pitch * 28.0 * disp

    map_x = CX + (XX - CX) / zoom + tx
    map_y = CY + (YY - CY) / zoom + ty
    return remap(rgb, map_x.astype(np.float32), map_y.astype(np.float32))


def write_mp4(frames: list[np.ndarray], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(FFMPEG),
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{W}x{H}",
        "-r",
        str(FPS),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "17",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(dest),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert proc.stdin is not None
    for fr in frames:
        proc.stdin.write(np.ascontiguousarray(fr).tobytes())
    proc.stdin.close()
    err = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
    code = proc.wait()
    if code != 0:
        raise RuntimeError(err[-2000:] or f"ffmpeg {code}")


def label(src: Path, text: str, dest: Path) -> None:
    safe = text.replace(":", "\\:").replace("'", "\u2019")
    subprocess.check_call(
        [
            str(FFMPEG),
            "-y",
            "-i",
            str(src),
            "-vf",
            (
                f"drawtext=fontfile={FONT}:text='{safe}':fontsize=36:"
                "fontcolor=white:borderw=3:bordercolor=black@0.75:"
                "x=(w-text_w)/2:y=72"
            ),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def concat(files: list[Path], dest: Path) -> None:
    lst = DIR / "_concat.txt"
    lst.write_text(
        "\n".join(f"file '{p.as_posix()}'" for p in files),
        encoding="utf-8",
    )
    subprocess.check_call(
        [
            str(FFMPEG),
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def title_card(text: str, dest: Path, seconds: float = 1.6) -> None:
    n = max(8, int(seconds * FPS))
    img = np.zeros((H, W, 3), dtype=np.uint8)
    img[:] = (18, 16, 14)
    tmp = DIR / "_title.png"
    cv2.imwrite(str(tmp), img)
    safe = text.replace(":", "\\:")
    subprocess.check_call(
        [
            str(FFMPEG),
            "-y",
            "-loop",
            "1",
            "-i",
            str(tmp),
            "-t",
            str(seconds),
            "-vf",
            (
                f"drawtext=fontfile={FONT}:text='{safe}':fontsize=42:"
                "fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2"
            ),
            "-r",
            str(FPS),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "17",
            "-pix_fmt",
            "yuv420p",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def save_depth_preview(depth: np.ndarray, dest: Path) -> None:
    vis = (np.clip(depth, 0, 1) * 255).astype(np.uint8)
    color = cv2.applyColorMap(vis, cv2.COLORMAP_INFERNO)
    dest.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(dest), color)


def main() -> None:
    manifest = json.loads((DIR / "manifest.json").read_text(encoding="utf-8"))
    clips: list[Path] = []
    title = DIR / "title.mp4"
    title_card("Ken Burns  vs  DepthFlow", title)
    clips.append(title)

    for item in manifest:
        pid = item["id"]
        print(f"\n-> render {pid}")
        rgb = cover_916(cv2.imread(item["photo"], cv2.IMREAD_COLOR))
        depth = load_depth(Path(item["depth"]), rgb.shape[:2])
        save_depth_preview(depth, DIR / "depth" / f"{pid}-preview.jpg")

        kb_frames = [ken_burns_frame(rgb, i / (FRAMES - 1)) for i in range(FRAMES)]
        px_frames = [parallax_frame(rgb, depth, i / (FRAMES - 1)) for i in range(FRAMES)]

        kb_raw = DIR / "clips" / f"{pid}-kenburns.mp4"
        px_raw = DIR / "clips" / f"{pid}-depthflow.mp4"
        write_mp4(kb_frames, kb_raw)
        write_mp4(px_frames, px_raw)

        kb_l = DIR / "clips" / f"{pid}-kenburns-l.mp4"
        px_l = DIR / "clips" / f"{pid}-depthflow-l.mp4"
        label(kb_raw, f"KEN BURNS  ·  {pid}", kb_l)
        label(px_raw, f"DEPTHFLOW  ·  {pid}", px_l)
        clips.extend([kb_l, px_l])
        print("  ok")

    out = DIR / "kenburns-vs-depthflow.mp4"
    concat(clips, out)
    dl = Path(r"D:\Downloads\kenburns-vs-depthflow.mp4")
    dl.write_bytes(out.read_bytes())
    print("\n->", out)
    print("->", dl)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)
