CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_intent_id" uuid NOT NULL,
	"channel" varchar(24) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"destination_hash" varchar(64),
	"destination_masked" varchar(255),
	"provider" varchar(64),
	"provider_message_id" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 8 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(128),
	"lock_expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_intent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"source_event_type" varchar(150) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid,
	"recipient_user_id" uuid,
	"recipient_kind" varchar(32) NOT NULL,
	"recipient_reference" varchar(255),
	"category" varchar(64) NOT NULL,
	"policy_key" varchar(128) NOT NULL,
	"template_key" varchar(128) NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"locale" varchar(16) DEFAULT 'es-CO' NOT NULL,
	"timezone" varchar(100) DEFAULT 'America/Bogota' NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"category" varchar(64) NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"timezone" varchar(100),
	"locale" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(24) NOT NULL,
	"destination_hash" varchar(64) NOT NULL,
	"reason" varchar(128) NOT NULL,
	"source" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_intent_id_notification_intents_id_fk" FOREIGN KEY ("notification_intent_id") REFERENCES "public"."notification_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_inbox_items" ADD CONSTRAINT "notification_inbox_items_notification_intent_id_notification_intents_id_fk" FOREIGN KEY ("notification_intent_id") REFERENCES "public"."notification_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_inbox_items" ADD CONSTRAINT "notification_inbox_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_inbox_items" ADD CONSTRAINT "notification_inbox_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_intents" ADD CONSTRAINT "notification_intents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_intents" ADD CONSTRAINT "notification_intents_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_intents" ADD CONSTRAINT "notification_intents_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_intent_channel_idx" ON "notification_deliveries" USING btree ("notification_intent_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_ready_idx" ON "notification_deliveries" USING btree ("next_attempt_at","created_at") WHERE "notification_deliveries"."status" in ('PENDING', 'FAILED');--> statement-breakpoint
CREATE INDEX "notification_deliveries_expired_lease_idx" ON "notification_deliveries" USING btree ("lock_expires_at") WHERE "notification_deliveries"."status" = 'PROCESSING';--> statement-breakpoint
CREATE INDEX "notification_deliveries_provider_message_idx" ON "notification_deliveries" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_inbox_intent_user_idx" ON "notification_inbox_items" USING btree ("notification_intent_id","user_id");--> statement-breakpoint
CREATE INDEX "notification_inbox_user_tenant_created_idx" ON "notification_inbox_items" USING btree ("user_id","tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_inbox_unread_idx" ON "notification_inbox_items" USING btree ("user_id","created_at") WHERE "notification_inbox_items"."read_at" is null and "notification_inbox_items"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_intents_dedupe_idx" ON "notification_intents" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notification_intents_tenant_created_idx" ON "notification_intents" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_intents_recipient_created_idx" ON "notification_intents" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_intents_source_event_idx" ON "notification_intents" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "notification_intents_status_created_idx" ON "notification_intents" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_global_idx" ON "notification_preferences" USING btree ("user_id","category") WHERE "notification_preferences"."tenant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_tenant_idx" ON "notification_preferences" USING btree ("user_id","tenant_id","category") WHERE "notification_preferences"."tenant_id" is not null;--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_tenant_idx_lookup" ON "notification_preferences" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_suppressions_channel_destination_idx" ON "notification_suppressions" USING btree ("channel","destination_hash");--> statement-breakpoint
CREATE INDEX "notification_suppressions_expires_idx" ON "notification_suppressions" USING btree ("expires_at");