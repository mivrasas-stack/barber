CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"owner_user_id" uuid,
	"media_kind" varchar(24) NOT NULL,
	"purpose" varchar(64) NOT NULL,
	"visibility" varchar(24) DEFAULT 'PRIVATE' NOT NULL,
	"original_filename" varchar(255),
	"source_object_key" varchar(512) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" bigint,
	"checksum_sha256" varchar(64),
	"width" integer,
	"height" integer,
	"duration_ms" bigint,
	"status" varchar(32) DEFAULT 'UPLOADING' NOT NULL,
	"processing_version" integer DEFAULT 1 NOT NULL,
	"last_error" text,
	"uploaded_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"allowed_mime" varchar(127) NOT NULL,
	"max_bytes" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"variant_key" varchar(64) NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_source_object_key_idx" ON "media_assets" USING btree ("source_object_key");--> statement-breakpoint
CREATE INDEX "media_assets_tenant_status_created_idx" ON "media_assets" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_owner_created_idx" ON "media_assets" USING btree ("owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_purpose_status_idx" ON "media_assets" USING btree ("purpose","status");--> statement-breakpoint
CREATE INDEX "media_assets_deleted_idx" ON "media_assets" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_upload_intents_asset_idx" ON "media_upload_intents" USING btree ("media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_upload_intents_object_key_idx" ON "media_upload_intents" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_upload_intents_expires_idx" ON "media_upload_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_variants_asset_variant_idx" ON "media_variants" USING btree ("media_asset_id","variant_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_variants_object_key_idx" ON "media_variants" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_variants_asset_created_idx" ON "media_variants" USING btree ("media_asset_id","created_at");