ALTER TABLE "outbox_events" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "max_attempts" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "locked_by" varchar(128);--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "lock_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "outbox_ready_claim_idx" ON "outbox_events" USING btree ("next_attempt_at","occurred_at") WHERE "outbox_events"."status" in ('PENDING', 'FAILED');--> statement-breakpoint
CREATE INDEX "outbox_expired_lease_idx" ON "outbox_events" USING btree ("lock_expires_at") WHERE "outbox_events"."status" = 'PROCESSING';--> statement-breakpoint
CREATE INDEX "outbox_published_at_idx" ON "outbox_events" USING btree ("published_at") WHERE "outbox_events"."status" = 'PUBLISHED';