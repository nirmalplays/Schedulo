import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiTokens, users, type User } from "@/db/schema";

/** Personal access tokens: `cc_pat_…`, shown once; only a sha256 hash is stored. */
export const TOKEN_PREFIX = "cc_pat_";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createApiToken(userId: string, name: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(apiTokens)
    .values({ userId, name, tokenHash: hashToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) })
    .returning();
  return { row, token };
}

export function apiError(status: number, title: string, message: string) {
  return NextResponse.json({ title, message }, { status });
}

// Simple fixed-window limiter per token (per server instance): 120 requests / minute.
const WINDOW_MS = 60_000;
const LIMIT = 120;
const hits = new Map<string, { start: number; count: number }>();
function rateLimited(key: string) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.start > WINDOW_MS) {
    if (hits.size > 10_000) hits.clear();
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  return ++h.count > LIMIT;
}

/** Resolves the Bearer token to its user, or returns the error response to send. */
export async function authenticate(req: Request): Promise<{ user: User } | { error: NextResponse }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token?.startsWith(TOKEN_PREFIX)) {
    return { error: apiError(401, "Unauthenticated", "Provide a personal access token: Authorization: Bearer cc_pat_…") };
  }
  const hash = hashToken(token);
  if (rateLimited(hash)) return { error: apiError(429, "Too Many Requests", "Rate limit is 120 requests per minute.") };

  const [row] = await db
    .select({ token: apiTokens, user: users })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1);
  if (!row) return { error: apiError(401, "Unauthenticated", "The access token is invalid or has been revoked.") };

  // Don't write on every request: refresh last-used at most once a minute.
  if (!row.token.lastUsedAt || Date.now() - row.token.lastUsedAt.getTime() > 60_000) {
    await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.token.id));
  }
  return { user: row.user };
}

/** Wraps a route handler with token auth and JSON error handling. */
export function withApiAuth<C>(handler: (req: Request, user: User, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const auth = await authenticate(req);
    if ("error" in auth) return auth.error;
    try {
      return await handler(req, auth.user, ctx);
    } catch (err) {
      console.error("[api] unhandled", err);
      return apiError(500, "Internal Server Error", "Something went wrong.");
    }
  };
}

/** Opaque cursor pagination helpers. */
export const encodeCursor = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
export function decodeCursor<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(Buffer.from(v, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
