import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/email";
import { exchangeCode, hasCalendarScopes, tokenInfo } from "@/lib/google/api";
import { saveGoogleConnection } from "@/lib/google/calendar";
import { getCurrentUser } from "@/lib/session";
import { connectRedirectUri, STATE_COOKIE } from "@/lib/google/oauth";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: NextRequest) {
  const back = (qs: string) => {
    const res = NextResponse.redirect(`${appUrl()}/dashboard/calendars?${qs}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/google" });
    return res;
  };

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/login`);

  const p = req.nextUrl.searchParams;
  if (p.get("error")) return back(`error=${encodeURIComponent(p.get("error") === "access_denied" ? "access was declined" : p.get("error")!)}`);
  const state = p.get("state") ?? "";
  const expected = req.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!state || !expected || !same(state, expected)) return back("error=expired%20request%2C%20please%20try%20again");
  const code = p.get("code");
  if (!code) return back("error=missing%20code");

  try {
    const tokens = await exchangeCode(code, connectRedirectUri());
    if (!hasCalendarScopes(tokens.scope)) return back("error=scopes");
    const info = await tokenInfo(tokens.access_token);
    await saveGoogleConnection({
      userId: user.id,
      providerAccountId: info.sub,
      email: info.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      scope: tokens.scope,
    });
  } catch (err) {
    console.error("[google] connect failed", err);
    return back("error=Google%20rejected%20the%20request");
  }
  return back("connected=1");
}
