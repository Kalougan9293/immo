"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, t: messages }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

/** Accès sûr hors provider (fallback FR) — rare */
export function useTOptional(): Messages | null {
  return useContext(I18nContext)?.t ?? null;
}

export function useLocale() {
  return useI18n().locale;
}

export function useSetLocale() {
  const { locale } = useI18n();
  return useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `areo-locale=${next};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = next;
      window.location.reload();
    },
    [locale],
  );
}
