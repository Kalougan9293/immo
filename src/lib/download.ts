/** Force le téléchargement d’une URL (y compris cross-origin signée). */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Téléchargement impossible.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
