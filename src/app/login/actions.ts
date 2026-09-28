"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/email";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const callbackUrl = () => `${appUrl()}/auth/callback`;

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(),
      // Calendar access in the same step as sign-in (PRD: host onboarding).
      scopes: GOOGLE_CALENDAR_SCOPES.join(" "),
      queryParams: { access_type: "offline", include_granted_scopes: "true" },
    },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`);
  redirect(data.url);
}

export async function signInWithEmail(_prev: { error?: string } | undefined, form: FormData) {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "Please enter a valid email address." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
  });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many sign-in emails were sent. Please wait a few minutes and try again."
          : error.message,
    };
  }
  redirect(`/login/check-email?email=${encodeURIComponent(email.data)}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
