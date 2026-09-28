import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * DATABASE_URL: Supabase (use the transaction pooler, port 6543, for serverless),
 * or `npm run db` for a fully local Postgres.
 */
function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  // Transaction-mode poolers (Supabase :6543, PgBouncer) don't support prepared statements.
  const transactionPooler = new URL(url).port === "6543";
  return drizzle(postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 5), prepare: !transactionPooler, onnotice: () => {} }), {
    schema,
  });
}

// Reuse one pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { __db?: DB };
export const db = globalForDb.__db ?? (globalForDb.__db = createDb());

export { schema };
