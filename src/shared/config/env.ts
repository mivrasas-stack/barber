import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env in non-Next environments (e.g., migrations, scripts, tests)
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:9002"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ CRITICAL: Invalid environment configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment variables. Fix .env or system environment.");
}

export const env = parsedEnv.data;
