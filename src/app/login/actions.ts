"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CredentialsResult =
  | {
      email: string;
      password: string;
    }
  | {
      error: string;
    };

function getCredentials(formData: FormData): CredentialsResult {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required."
    };
  }

  return { email, password };
}

function loginRedirect(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function signInWithPassword(formData: FormData) {
  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    loginRedirect("/login", credentials.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    loginRedirect("/login", error.message);
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  if (process.env.MEALBOARD_ENABLE_PUBLIC_SIGNUP !== "true") {
    loginRedirect("/login", "Account creation is disabled for this private MVP.");
  }

  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    loginRedirect("/login", credentials.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    loginRedirect("/login", error.message);
  }

  loginRedirect(
    "/login",
    "Account created. Add this user to the seeded household, then sign in."
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
