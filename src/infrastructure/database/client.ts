import { Pool, PoolConfig } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "@/shared/config/env";

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
};

// Global singleton pattern to prevent pool exhaustion during Next.js hot reloads in development
declare global {
  var __barber_db_pool__: Pool | undefined;
  var __barber_drizzle_db__: NodePgDatabase<typeof schema> | undefined;
}

export const pool: Pool = global.__barber_db_pool__ ?? new Pool(poolConfig);

if (env.NODE_ENV !== "production") {
  global.__barber_db_pool__ = pool;
}

export const db: NodePgDatabase<typeof schema> =
  global.__barber_drizzle_db__ ?? drizzle(pool, { schema });

if (env.NODE_ENV !== "production") {
  global.__barber_drizzle_db__ = db;
}
