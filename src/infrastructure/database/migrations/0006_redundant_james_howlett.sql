CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"owner_tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"provider_transaction_id" varchar(128),
	"payment_method_type" varchar(64),
	"status" varchar(32) DEFAULT 'INITIATED' NOT NULL,
	"failure_code" varchar(64),
	"failure_message_sanitized" varchar(255),
	"raw_response_sanitized" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"collector_tenant_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"status" varchar(32) DEFAULT 'CREATED' NOT NULL,
	"provider_reference" varchar(128),
	"provider_transaction_id" varchar(128),
	"payment_method_type" varchar(64),
	"idempotency_key_hash" varchar(64),
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"created_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_transaction_id" varchar(128),
	"reconciliation_status" varchar(32) NOT NULL,
	"status_internal" varchar(32) NOT NULL,
	"status_provider" varchar(32),
	"internal_amount_minor" bigint NOT NULL,
	"provider_amount_minor" bigint,
	"discrepancy_details" jsonb,
	"reconciled_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_event_id" varchar(128) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"processing_status" varchar(32) DEFAULT 'RECEIVED' NOT NULL,
	"error_code" varchar(64),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"collector_tenant_id" uuid NOT NULL,
	"order_return_id" text,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'REQUESTED' NOT NULL,
	"provider_refund_id" varchar(128),
	"idempotency_key_hash" varchar(64),
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_tenders" ADD COLUMN "payment_intent_id" uuid;--> statement-breakpoint
ALTER TABLE "order_tenders" ADD COLUMN "verification_status" varchar(32) DEFAULT 'MANUAL_DECLARED' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_owner_tenant_id_tenants_id_fk" FOREIGN KEY ("owner_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_collector_tenant_id_tenants_id_fk" FOREIGN KEY ("collector_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_reconciled_by_user_id_users_id_fk" FOREIGN KEY ("reconciled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_collector_tenant_id_tenants_id_fk" FOREIGN KEY ("collector_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inv_res_intent" ON "inventory_reservations" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_inv_res_order" ON "inventory_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_inv_res_status_expires" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_payment_attempts_intent" ON "payment_attempts" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_payment_attempts_tx" ON "payment_attempts" USING btree ("provider_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_order" ON "payment_intents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_collector_created" ON "payment_intents" USING btree ("collector_tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_provider_ref" ON "payment_intents" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_intents_provider_tx" ON "payment_intents" USING btree ("provider","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_idempotency" ON "payment_intents" USING btree ("idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_status" ON "payment_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_intent" ON "payment_reconciliations" USING btree ("payment_intent_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reconciliations_status" ON "payment_reconciliations" USING btree ("reconciliation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_events_provider_event_id" ON "payment_webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_received" ON "payment_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_refunds_intent" ON "refunds" USING btree ("payment_intent_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_refunds_order" ON "refunds" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_refunds_status" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_tenders_payment_intent_idx" ON "order_tenders" USING btree ("payment_intent_id");