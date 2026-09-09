from pathlib import Path

p = Path(r"D:\Desktop\IMMO\src\lib\render\ffmpeg.ts")
t = p.read_text(encoding="utf-8")
start = t.find("/** Échappe le texte pour le filtre drawtext FFmpeg. */")
end = t.find("const PIN_EMOJI_RE", start)
if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")

new = r'''/** Normalise le texte affiché (fichiers textfile drawtext). */
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

'''

p.write_text(t[:start] + new + t[end:], encoding="utf-8")
print("OK")
