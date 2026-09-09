import {
  getWritingStyle,
  type WritingStyleId,
} from "@/data/writing-styles";

export const WRITING_STYLE_SESSION_KEY = "areo-writing-style";

export function saveWritingStyleId(id: WritingStyleId) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WRITING_STYLE_SESSION_KEY, id);
}

export function loadWritingStyleId(): WritingStyleId | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(WRITING_STYLE_SESSION_KEY);
  if (!raw) return null;
  const style = getWritingStyle(raw);
  return style.id === raw ? style.id : null;
}

export function loadWritingStyle() {
  return getWritingStyle(loadWritingStyleId());
}

export function clearWritingStyleId() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(WRITING_STYLE_SESSION_KEY);
}
