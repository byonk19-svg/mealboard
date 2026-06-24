"use server";

import { redirect } from "next/navigation";
import { resolveLoginReturnPath } from "@/lib/auth/return-path";
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

function loginRedirect(path: string, message: string, returnTo?: string): never {
  const params = new URLSearchParams({ message });

  if (returnTo) {
    params.set("returnTo", resolveLoginReturnPath(returnTo));
  }

  redirect(`${path}?${params.toString()}`);
}

export async function signInWithPassword(formData: FormData) {
  const credentials = getCredentials(formData);
  const returnTo = resolveLoginReturnPath(
    String(formData.get("returnTo") ?? "")
  );

  if ("error" in credentials) {
    loginRedirect("/login", credentials.error, returnTo);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    loginRedirect("/login", error.message, returnTo);
  }

  redirect(returnTo);
}

export async function signUpWithPassword(formData: FormData) {
  const returnTo = resolveLoginReturnPath(
    String(formData.get("returnTo") ?? "")
  );

  if (process.env.MEALBOARD_ENABLE_PUBLIC_SIGNUP !== "true") {
    loginRedirect(
      "/login",
      "Account creation is disabled for this private MVP.",
      returnTo
    );
  }

  const credentials = getCredentials(formData);

  if ("error" in credentials) {
    loginRedirect("/login", credentials.error, returnTo);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    loginRedirect("/login", error.message, returnTo);
  }

  loginRedirect(
    "/login",
    "Account created. Add this user to the seeded household, then sign in.",
    returnTo
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
