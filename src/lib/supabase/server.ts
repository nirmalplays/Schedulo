import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** No browser-side Supabase client exists, so JavaScript never needs the session cookie. */
export const SUPABASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: (process.env.APP_URL ?? "").startsWith("https://"),
  sameSite: "lax" as const,
  path: "/",
};

export function supabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  return { url, key };
}

/** Supabase client bound to the request's auth cookies. Create one per request. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
