"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { useT } from "@/components/i18n/I18nProvider";

type HeaderAccountLinkProps = {
  onHero?: boolean;
};

export function HeaderAccountLink({ onHero = false }: HeaderAccountLinkProps) {
  const t = useT();
  const [user, setUser] = useState<{
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => {
        const u = data.user;
        if (!u) {
          setUser(null);
          return;
        }
        const name =
          (u.user_metadata?.full_name as string | undefined)?.trim() ||
          u.email?.split("@")[0] ||
          t.common.account;
        setUser({ name, email: u.email ?? "" });
      });
    } catch {
      // Misconfigured env — keep guest UI
    }
  }, [t.common.account]);

  if (!user) {
    return <span className="w-10" aria-hidden />;
  }

  return (
    <AccountMenu name={user.name} email={user.email} onHero={onHero} />
  );
}
