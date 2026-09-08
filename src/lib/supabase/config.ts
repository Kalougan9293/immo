/** Strip BOM / wrapping quotes / accidental `KEY=value` paste from Render/.env. */
function cleanEnv(raw: string | undefined, keyName: string): string | undefined {
  if (!raw) return undefined;
  let v = raw.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  const prefix = `${keyName}=`;
  if (v.startsWith(prefix)) {
    v = v.slice(prefix.length).trim();
  }
  // Multiline paste: keep first line only
  v = v.split(/\r?\n/)[0]?.trim() ?? "";
  return v || undefined;
}

export function getSupabaseEnv() {
  const url = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const key = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return false;
  if (url.includes("TON_PROJECT") || key.includes("TON_ANON")) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  } catch {
    return false;
  }
  return true;
}
