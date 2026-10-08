CREATE TABLE "billing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" varchar(32) DEFAULT 'RUNNING' NOT NULL,
	"tenants_processed" integer DEFAULT 0 NOT NULL,
	"invoices_created" integer DEFAULT 0 NOT NULL,
	"payments_attempted" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"triggered_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"amount_minor" bigint NOT NULL,
	"line_type" varchar(32) DEFAULT 'PLAN_CHARGE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"status" varchar(32) DEFAULT 'OPEN' NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"plan_code_snapshot" varchar(50) NOT NULL,
	"plan_name_snapshot" varchar(255) NOT NULL,
	"billing_period_snapshot" varchar(32) DEFAULT 'MONTHLY' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "subscription_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_status" varchar(32),
	"to_status" varchar(32) NOT NULL,
	"reason" text,
	"source" varchar(64) DEFAULT 'SYSTEM' NOT NULL,
	"actor_user_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_intents" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "past_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "grace_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "pending_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "pending_plan_effective_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "payment_method_token" varchar(255);--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "payment_method_brand" varchar(50);--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "payment_method_last4" varchar(4);--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "subscription_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD COLUMN "payment_purpose" varchar(32) DEFAULT 'ORDER_PAYMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_runs" ADD CONSTRAINT "billing_runs_triggered_by_user_id_users_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoice_lines" ADD CONSTRAINT "subscription_invoice_lines_invoice_id_subscription_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."subscription_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_tenant_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tenant_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_status_history" ADD CONSTRAINT "subscription_status_history_subscription_id_tenant_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tenant_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_status_history" ADD CONSTRAINT "subscription_status_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_status_history" ADD CONSTRAINT "subscription_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_runs_status_idx" ON "billing_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_runs_started_idx" ON "billing_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sub_inv_lines_inv_idx" ON "subscription_invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sub_inv_tenant_idx" ON "subscription_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sub_inv_sub_idx" ON "subscription_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "sub_inv_status_due_idx" ON "subscription_invoices" USING btree ("status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_inv_sub_period_unique_idx" ON "subscription_invoices" USING btree ("subscription_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "sub_history_sub_created_idx" ON "subscription_status_history" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "sub_history_tenant_idx" ON "subscription_status_history" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_pending_plan_id_subscription_plans_id_fk" FOREIGN KEY ("pending_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_subscription_invoice_id_subscription_invoices_id_fk" FOREIGN KEY ("subscription_invoice_id") REFERENCES "public"."subscription_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_sub_period_end_idx" ON "tenant_subscriptions" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_sub_invoice" ON "payment_intents" USING btree ("subscription_invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_purpose" ON "payment_intents" USING btree ("payment_purpose");