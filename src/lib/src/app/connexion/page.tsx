"use client";

import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useT } from "@/components/i18n/I18nProvider";

export default function ConnexionPage() {
  const t = useT();
  const ready = isSupabaseConfigured();

  return (
    <AppShell contained>
      <Header showBack backHref="/" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="animate-fade-up w-full max-w-sm text-center">
          <h1 className="font-display text-3xl font-medium text-pearl">
            {t.auth.signInTitle}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            {t.auth.signInHint}
          </p>

          {ready ? (
            <SignInForm />
          ) : (
            <div className="mt-8 rounded-2xl border border-border bg-surface px-5 py-6 text-left text-[13px] leading-relaxed text-muted">
              <p className="font-medium text-pearl">Configuration required</p>
              <p className="mt-2">
                Add your Supabase keys in{" "}
                <code className="text-gold">.env.local</code> then restart{" "}
                <code className="text-gold">npm run dev</code>.
              </p>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
