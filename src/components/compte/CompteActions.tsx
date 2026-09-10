"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type CompteActionsProps = {
  quotaFull?: boolean;
};

export function CompteActions({ quotaFull = false }: CompteActionsProps) {
  const t = useT();
  const tabClass =
    "flex h-11 items-center justify-center rounded-xl px-2 text-center text-[13px] font-semibold tracking-wide transition-colors";

  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1">
      {quotaFull ? (
        <span className={cn(tabClass, "cursor-not-allowed text-muted/50")}>
          {t.compte.createVideo}
        </span>
      ) : (
        <Link
          href="/creer"
          className={cn(tabClass, "text-pearl hover:bg-surface-elevated")}
        >
          {t.compte.createVideo}
        </Link>
      )}
      <span
        className={cn(tabClass, "bg-gold-soft text-pearl")}
        aria-current="page"
      >
        {t.compte.yourVideos}
      </span>
    </div>
  );
}
