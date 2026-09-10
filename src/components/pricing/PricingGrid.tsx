import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setPlan } from "@/app/actions/billing";
import { PLAN_LIST, type PlanId } from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/messages";

function planName(id: PlanId, t: Messages): string {
  if (id === "pro") return t.pricing.pro;
  if (id === "agence") return t.pricing.agence;
  return t.pricing.starter;
}

function planPitch(id: PlanId, t: Messages): string {
  if (id === "pro") return t.pricing.proPitch;
  if (id === "agence") return t.pricing.agencePitch;
  return t.pricing.starterPitch;
}

export function PricingGrid({
  t,
  currentPlanId,
  loggedIn,
}: {
  t: Messages;
  currentPlanId: PlanId | null;
  loggedIn: boolean;
}) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {PLAN_LIST.map((plan) => {
        const current = currentPlanId === plan.id;
        const isStarter = plan.id === "starter";
        const ctaLabel = isStarter ? t.pricing.starterCta : t.pricing.cta;
        const ctaVariant =
          plan.highlighted || isStarter ? "gold" : "primary";
        return (
          <article
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-3xl border px-5 py-6",
              plan.highlighted
                ? "border-gold/50 bg-gold-soft shadow-[0_0_40px_var(--gold-glow)]"
                : isStarter
                  ? "border-gold/25 bg-surface"
                  : "border-border bg-surface",
            )}
          >
            {plan.highlighted ? (
              <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-gold uppercase">
                {t.pricing.recommended}
              </p>
            ) : isStarter ? (
              <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-gold uppercase">
                {t.pricing.starterBadge}
              </p>
            ) : (
              <p className="mb-3 text-[10px] tracking-[0.16em] text-transparent uppercase">
                ·
              </p>
            )}
            <h2 className="font-display text-2xl font-medium text-pearl">
              {planName(plan.id, t)}
            </h2>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl text-pearl">
                {plan.priceEur} €
              </span>
              <span className="text-[12px] text-muted">{t.pricing.monthly}</span>
            </p>
            <p className="mt-2 text-left text-[13px] leading-relaxed text-muted-strong">
              {planPitch(plan.id, t)}
            </p>
            <ul className="mt-5 space-y-2.5 text-left text-[13px] leading-relaxed text-muted-strong">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={2} />
                <span>
                  {plan.videosPerMonth} {t.pricing.videos}
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={2} />
                <span>{t.pricing.photos}</span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-gold" strokeWidth={2} />
                <span>{t.pricing.format}</span>
              </li>
            </ul>
            <div className="mt-auto pt-6">
              {current ? (
                <Button fullWidth variant="ghost" disabled>
                  {t.pricing.current}
                </Button>
              ) : loggedIn ? (
                <form action={setPlan}>
                  <input type="hidden" name="plan" value={plan.id} />
                  <Button
                    fullWidth
                    variant={ctaVariant}
                    type="submit"
                  >
                    {ctaLabel}
                  </Button>
                </form>
              ) : (
                <Button
                  href={`/inscription?plan=${plan.id}`}
                  fullWidth
                  variant={ctaVariant}
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
