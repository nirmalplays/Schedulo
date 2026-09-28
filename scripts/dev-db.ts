/**
 * Local Postgres for development: real Postgres binaries via `embedded-postgres`,
 * no Docker or system install needed. Data lives in ./.data/postgres.
 *
 *   npm run db     # leave running in its own terminal
 */
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 54329;
const DATABASE = "calclone";
const databaseDir = "./.data/postgres";

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  // "localhost" binds only ::1 on some Windows setups; DATABASE_URL uses 127.0.0.1.
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
});

async function main() {
  if (!existsSync(`${databaseDir}/PG_VERSION`)) {
    console.log("Initialising a new Postgres cluster…");
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE]);
  await client.end();
  if (!rowCount) await pg.createDatabase(DATABASE);

  console.log(`Postgres ready: postgres://postgres:postgres@127.0.0.1:${PORT}/${DATABASE}`);
  console.log("Press Ctrl+C to stop.");
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await pg.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (err) => {
  console.error(err);
  await pg.stop().catch(() => {});
  process.exit(1);
});
