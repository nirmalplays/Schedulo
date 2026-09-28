import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "../src/db";

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations applied.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
