ALTER TABLE "media_assets" ADD COLUMN "processing_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_max_attempts" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "next_processing_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_lease_id" varchar(64);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_locked_by" varchar(128);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_lock_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "media_assets_processing_ready_idx" ON "media_assets" USING btree ("status","next_processing_attempt_at","created_at") WHERE "media_assets"."status" in ('UPLOADED', 'FAILED');--> statement-breakpoint
CREATE INDEX "media_assets_processing_expired_lease_idx" ON "media_assets" USING btree ("processing_lock_expires_at") WHERE "media_assets"."status" = 'PROCESSING';