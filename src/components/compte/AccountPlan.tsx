import type { AccountBilling } from "@/lib/billing-account";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function AccountPlan({
  billing,
  locale,
}: {
  billing: AccountBilling;
  locale: Locale;
}) {
  const t = getMessages(locale);
  const { remaining } = billing;
  const short =
    remaining === 1 ? t.compte.remainingShortOne : t.compte.remainingShort;

  return (
    <section className="px-2 pt-4 pb-1 text-center" role="status">
      <p className="flex items-baseline justify-center gap-2">
        <span
          className={cn(
            "font-display text-5xl leading-none text-pearl sm:text-6xl",
            remaining <= 0 && "text-muted",
          )}
        >
          {remaining}
        </span>
        <span className="text-[13px] text-muted">{short}</span>
      </p>
    </section>
  );
}
