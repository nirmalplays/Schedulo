import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { hasCalendarScopes, tokenInfo } from "@/lib/google/api";
import { saveGoogleConnection } from "@/lib/google/calendar";
import { ensureProfile } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Auth redirects here after Google sign-in or a magic link (PKCE ?code=).
 * Google's tokens are only available at this moment (Supabase doesn't keep them),
 * so calendar access granted during sign-in is captured here.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, url));

  const errorDescription = url.searchParams.get("error_description");
  if (errorDescription) return fail(errorDescription);
  const code = url.searchParams.get("code");
  // token_hash links (email template: {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email)
  // work on any device; PKCE ?code= links only in the browser that requested them.
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (!code && !(tokenHash && type)) return fail("Sign-in link is invalid or has expired.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
  if (error || !data.session || !data.user) {
    return fail(code && error ? "Open the sign-in link in the same browser you requested it from, or request a new one." : (error?.message ?? "Couldn't sign you in."));
  }

  const { user, session } = data;
  const meta = user.user_metadata ?? {};
  const profile = await ensureProfile({
    id: user.id,
    email: user.email,
    name: meta.full_name ?? meta.name,
    image: meta.avatar_url ?? meta.picture,
  });

  let calendarNote = "";
  if (session.provider_token) {
    try {
      const info = await tokenInfo(session.provider_token);
      if (hasCalendarScopes(info.scope)) {
        await saveGoogleConnection({
          userId: user.id,
          providerAccountId: info.sub,
          email: info.email ?? user.email,
          accessToken: session.provider_token,
          refreshToken: session.provider_refresh_token,
          expiresAt: Math.floor(Date.now() / 1000) + info.expiresIn,
          scope: info.scope,
        });
      } else {
        calendarNote = "?calendar=missing";
      }
    } catch (err) {
      // Sign-in still succeeds; the host can connect the calendar from the dashboard.
      console.error("[auth] capturing Google calendar tokens failed", err);
    }
  }

  const next = url.searchParams.get("next");
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : profile.username ? `/dashboard${calendarNote}` : "/onboarding";
  return NextResponse.redirect(new URL(dest, url));
}
