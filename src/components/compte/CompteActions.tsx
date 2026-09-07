"use client";

import { Sparkles, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/i18n/I18nProvider";

export function CompteActions() {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <Button
        href="/creer"
        fullWidth
        showArrow
        icon={Sparkles}
        className="text-[15px] font-bold tracking-[0.05em] text-white"
      >
        {t.compte.createVideo}
      </Button>
      <Button
        href="#vos-videos"
        fullWidth
        variant="ghost"
        icon={Film}
        className="border-border-strong bg-surface text-[15px] font-semibold tracking-wide text-pearl hover:bg-surface-elevated"
      >
        {t.compte.yourVideos}
      </Button>
    </div>
  );
}
