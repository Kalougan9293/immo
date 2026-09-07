"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function Hero() {
  const t = useT();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });
  }, []);

  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col sm:min-h-[calc(100dvh-4rem)]">
      <div
        aria-hidden
        className="animate-fade-in pointer-events-none absolute inset-0 overflow-hidden"
      >
        <video
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-8 text-center sm:px-10">
        <div className="mx-auto w-full max-w-lg lg:max-w-xl">
          <h1 className="hero-title animate-fade-up font-display text-[3.5rem] leading-[0.95] font-semibold tracking-[0.2em] sm:text-7xl lg:text-[5.75rem]">
            ARÉO
          </h1>

          <p className="hero-copy animate-fade-up animate-delay-1 mt-8 text-[1.15rem] leading-relaxed font-medium tracking-wide sm:mt-9 sm:text-[1.35rem]">
            {t.home.tagline}
            <br />
            <span className="hero-copy-strong mt-1 inline-block font-semibold tracking-normal">
              {t.home.taglineStrong}
            </span>
          </p>

          <div className="animate-fade-up animate-delay-2 mx-auto mt-11 w-full max-w-xs sm:mt-12 sm:max-w-sm">
            <Button
              href="/creer"
              fullWidth
              showArrow
              icon={Sparkles}
              className="text-[15px] font-bold tracking-[0.05em] text-white"
            >
              {t.home.cta}
            </Button>

            <div className="mt-6 flex flex-col items-center gap-3">
              {isLoggedIn ? (
                <Link
                  href="/compte"
                  className="hero-link text-[14px] font-semibold tracking-wide text-white/90 transition-colors hover:text-white"
                >
                  {t.home.myAccount}
                </Link>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    className="hero-link text-[14px] font-semibold tracking-wide text-white/90 transition-colors hover:text-white"
                  >
                    {t.home.signIn}
                  </Link>
                  <Link
                    href="/inscription"
                    className="hero-link text-[12px] font-medium tracking-wide text-white/55 transition-colors hover:text-white/80"
                  >
                    {t.home.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
