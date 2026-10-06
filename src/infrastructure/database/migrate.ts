import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";
import path from "path";

export async function runMigrations() {
  console.log("⏳ Running database migrations...");
  const migrationsFolder = path.resolve(process.cwd(), "src/infrastructure/database/migrations");
  await migrate(db, { migrationsFolder });
  console.log("✅ Migrations applied successfully!");
}

if (process.argv[1] && process.argv[1].includes("migrate")) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Migration failed:", err);
      await pool.end();
      process.exit(1);
    });
}
