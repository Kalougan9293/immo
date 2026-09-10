"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_META_KEY, parsePlanId } from "@/lib/billing";

export async function setPlan(formData: FormData) {
  const planId = parsePlanId(formData.get("plan"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/inscription?plan=${planId}`);
  }

  const { error } = await supabase.auth.updateUser({
    data: { [PLAN_META_KEY]: planId },
  });
  if (error) {
    redirect(`/tarifs?error=1`);
  }

  redirect("/compte");
}
