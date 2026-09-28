import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/server";

/**
 * Refreshes the Supabase session cookie before rendering host pages
 * (Server Components can't write cookies themselves).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  // Validates the JWT and refreshes it when expired; must run before any rendering.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Host-facing routes only; public booking pages don't need a session.
  matcher: ["/", "/login/:path*", "/onboarding", "/dashboard/:path*"],
};
