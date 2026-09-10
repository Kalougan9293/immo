"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/I18nProvider";

type AccountMenuProps = {
  name: string;
  email: string;
  onHero?: boolean;
};

export function AccountMenu({ name, email, onHero = false }: AccountMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, ready } = useTheme();

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "text-[11px] font-medium tracking-[0.12em] uppercase transition-opacity",
          onHero
            ? "hero-nav opacity-90 hover:opacity-100"
            : "text-muted-strong hover:text-pearl",
        )}
      >
        {t.common.account}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-3 w-52 overflow-hidden rounded-2xl border border-border bg-surface-elevated text-center shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
        >
          <div className="border-b border-border px-4 py-3.5">
            <p className="truncate text-[13px] font-medium text-pearl">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{email}</p>
          </div>

          <Link
            href="/compte"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-border px-4 py-3 text-center text-[13px] text-pearl transition-colors hover:bg-[var(--menu-hover)]"
          >
            {t.common.account}
          </Link>

          <Link
            href="/tarifs"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full border-b border-border px-4 py-3 text-center text-[13px] text-pearl transition-colors hover:bg-[var(--menu-hover)]"
          >
            {t.home.pricing}
          </Link>

          <div className="flex items-center justify-center gap-2 border-b border-border px-4 py-2.5">
            <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
              {t.accountMenu.theme}
            </span>
            <div className="inline-flex items-center rounded-full border border-border p-0.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={theme === "dark"}
                aria-label={t.accountMenu.dark}
                disabled={!ready}
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-colors",
                  theme === "dark"
                    ? "bg-pearl/10 text-pearl"
                    : "text-muted hover:text-muted-strong",
                )}
              >
                <Moon className="size-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={theme === "light"}
                aria-label={t.accountMenu.light}
                disabled={!ready}
                onClick={() => setTheme("light")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-colors",
                  theme === "light"
                    ? "bg-pearl/10 text-pearl"
                    : "text-muted hover:text-muted-strong",
                )}
              >
                <Sun className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-3 text-center text-[13px] text-muted-strong transition-colors hover:bg-[var(--menu-hover)] hover:text-pearl"
            >
              {t.accountMenu.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
