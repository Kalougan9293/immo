"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
};

function getMessage(error: { message: string } | null) {
  if (!error) return "Une erreur est survenue.";
  const msg = error.message.toLowerCase();
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Cet email est déjà utilisé.";
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (msg.includes("password")) {
    return "Mot de passe trop court (6 caractères minimum).";
  }
  if (msg.includes("email")) {
    return "Email invalide.";
  }
  return error.message;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }
  if (password.length < 6) {
    return { error: "Mot de passe trop court (6 caractères minimum)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name || null },
    },
  });

  if (error) {
    return { error: getMessage(error) };
  }

  // Si confirmation email activée, pas de session immédiate
  if (!data.session) {
    return {
      success:
        "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.",
    };
  }

  redirect("/compte");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: getMessage(error) };
  }

  redirect("/compte");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
