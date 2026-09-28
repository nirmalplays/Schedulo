import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSupabaseServerClient } from "./supabase/server";

type AuthIdentity = { id: string; email?: string | null; name?: string | null; image?: string | null };

/** Creates the app profile for a Supabase Auth user on first sign-in; keeps email in sync. */
export async function ensureProfile(identity: AuthIdentity) {
  const [row] = await db
    .insert(users)
    .values({ id: identity.id, email: identity.email ?? null, name: identity.name ?? null, image: identity.image ?? null })
    .onConflictDoUpdate({ target: users.id, set: { email: identity.email ?? null } })
    .returning();
  return row;
}

/** Verified identity from the Supabase session (JWT checked against the project's signing keys). */
export const getAuthIdentity = cache(async (): Promise<AuthIdentity | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    name: (meta.full_name ?? meta.name) as string | undefined,
    image: (meta.avatar_url ?? meta.picture) as string | undefined,
  };
});

/** Current signed-in host's profile, or null. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const identity = await getAuthIdentity();
  if (!identity) return null;
  const [user] = await db.select().from(users).where(eq(users.id, identity.id)).limit(1);
  return user ?? (await ensureProfile(identity));
});

/** For host pages: must be signed in and onboarded. */
export async function requireHost() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.username) redirect("/onboarding");
  return user as typeof user & { username: string };
}
