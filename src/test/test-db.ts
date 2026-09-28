/**
 * Test database for integration tests. Use from a test file with:
 *   vi.mock("@/db", () => import("@/test/test-db").then((m) => m.createTestDbModule()));
 *
 * Default: in-memory PGlite (real Postgres semantics, no server needed).
 * TEST_DATABASE_URL=postgres://... runs against a real, empty database instead.
 */
import * as schema from "@/db/schema";

export async function createTestDbModule() {
  if (process.env.TEST_DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { default: postgres } = await import("postgres");
    return { db: drizzle(postgres(process.env.TEST_DATABASE_URL, { max: 10, onnotice: () => {} }), { schema }), schema };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite("memory://", { extensions: { btree_gist } }), { schema }), schema };
}

/** Applies migrations and creates a host with the onboarding defaults. */
export async function setupHost(username = "host") {
  const { db } = await import("@/db");
  const { migrate } = process.env.TEST_DATABASE_URL
    ? await import("drizzle-orm/postgres-js/migrator")
    : await import("drizzle-orm/pglite/migrator");
  await migrate(db as never, { migrationsFolder: "./drizzle" });
  const { createHostDefaults } = await import("@/lib/defaults");
  const [host] = await db
    .insert(schema.users)
    .values({ email: `${username}@example.com`, username, name: "Host", timezone: "Asia/Kolkata" })
    .returning();
  await createHostDefaults(db, host.id, "Asia/Kolkata");
  const [eventType] = await db.select().from(schema.eventTypes);
  return { db, host, eventType };
}
