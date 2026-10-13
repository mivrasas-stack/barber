import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env in non-Next environments (e.g., migrations, scripts, tests)
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:9002"),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_OUTBOX_QUEUE_NAME: z.string().default("barber-paradise-outbox"),
  REDIS_REALTIME_QUEUE_NAME: z.string().default("barber-paradise-outbox-realtime"),
  REDIS_NOTIFICATION_QUEUE_NAME: z.string().default("barber-paradise-outbox-notifications"),
  REDIS_MEDIA_QUEUE_NAME: z.string().default("barber-paradise-media-processing"),
  REDIS_QUEUE_PREFIX: z.string().default("bp:queue"),
  OUTBOX_PUBLISH_FROM: z.string().optional(),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
  OUTBOX_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  OUTBOX_LEASE_DURATION_MS: z.coerce.number().int().min(1000).default(30000),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(50).default(500),
  OUTBOX_PUBLISH_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
  NOTIFICATION_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  MEDIA_PROCESSING_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(2),
  MEDIA_PROCESSING_POLL_INTERVAL_MS: z.coerce.number().int().min(100).default(500),
  MEDIA_PROCESSING_DISCOVERY_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  MEDIA_STORAGE_PROVIDER: z.enum(["memory", "s3"]).default("memory"),
  MEDIA_STORAGE_BUCKET: z.string().optional(),
  MEDIA_STORAGE_REGION: z.string().default("auto"),
  MEDIA_STORAGE_ENDPOINT: z.string().url().optional(),
  MEDIA_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  MEDIA_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  MEDIA_PUBLIC_CDN_URL: z.string().url().optional(),
  MEDIA_PRIVATE_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  NOTIFICATION_DELIVERY_ENABLED: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().default(false)
  ),
  NOTIFICATION_DELIVERY_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
  NOTIFICATION_DELIVERY_LEASE_DURATION_MS: z.coerce.number().int().min(1000).default(30000),
  NOTIFICATION_DELIVERY_POLL_INTERVAL_MS: z.coerce.number().int().min(50).default(1000),
  NOTIFICATION_DELIVERY_SEND_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_API_KEY_SID: z.string().optional(),
  TWILIO_API_KEY_SECRET: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  RATE_LIMIT_PREFIX: z.string().default("bp:rl:v1"),
  RATE_LIMIT_FAIL_CLOSED: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().default(false)
  ),
  TRUSTED_PROXY_COUNT: z.coerce.number().default(1),
  REALTIME_PORT: z.coerce.number().default(9003),
  REALTIME_ALLOWED_ORIGINS: z.string().default("http://localhost:9002,http://localhost:3000"),
  REALTIME_HEARTBEAT_INTERVAL_MS: z.coerce.number().default(15000),
  REALTIME_HEARTBEAT_TIMEOUT_MS: z.coerce.number().default(30000),
  REALTIME_PRESENCE_TTL_SECONDS: z.coerce.number().default(60),
  REALTIME_FANOUT_CHANNEL: z.string().default("bp:realtime:fanout"),
  REALTIME_MAX_PAYLOAD_BYTES: z.coerce.number().default(32768),
  REALTIME_MAX_SUBSCRIPTIONS_PER_SOCKET: z.coerce.number().default(50),
  REALTIME_AUTH_TIMEOUT_MS: z.coerce.number().default(10000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ CRITICAL: Invalid environment configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment variables. Fix .env or system environment.");
}

export const env = parsedEnv.data;
