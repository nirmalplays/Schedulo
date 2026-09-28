import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/email";
import { authorizationUrl, googleConfigured } from "@/lib/google/api";
import { connectRedirectUri, STATE_COOKIE } from "@/lib/google/oauth";
import { getCurrentUser } from "@/lib/session";

/** Starts "Connect Google Calendar" for the signed-in host (any Google account). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`);
  if (!googleConfigured()) return NextResponse.redirect(`${appUrl()}/dashboard/calendars`);

  // CSRF protection: the callback must present the same state as this cookie.
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizationUrl(connectRedirectUri(), state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}
