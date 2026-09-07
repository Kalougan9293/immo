"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/i18n/I18nProvider";

const initial: AuthState = {};

export function SignInForm() {
  const t = useT();
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="mt-8 space-y-3 text-left">
      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-muted uppercase">
          {t.auth.email}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-pearl outline-none placeholder:text-muted focus:border-gold/40"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-muted uppercase">
          {t.auth.password}
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-pearl outline-none placeholder:text-muted focus:border-gold/40"
        />
      </label>

      {state.error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        fullWidth
        className="mt-2"
        variant="gold"
        type="submit"
        disabled={pending}
      >
        {pending ? t.auth.signingIn : t.auth.signIn}
      </Button>

      <p className="pt-3 text-center text-[13px] text-muted">
        {t.auth.noAccount}{" "}
        <Link href="/inscription" className="text-pearl hover:text-gold">
          {t.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
