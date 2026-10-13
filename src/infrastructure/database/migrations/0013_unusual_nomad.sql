CREATE TABLE "customer_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"phone_normalized" varchar(32) NOT NULL,
	"email" varchar(255),
	"status" varchar(32) DEFAULT 'UNVERIFIED' NOT NULL,
	"source" varchar(32) DEFAULT 'QR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_intakes" ADD CONSTRAINT "customer_intakes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_intakes" ADD CONSTRAINT "customer_intakes_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_intakes_tenant_phone_unique" ON "customer_intakes" USING btree ("tenant_id","phone_normalized");--> statement-breakpoint
CREATE INDEX "customer_intakes_tenant_created_idx" ON "customer_intakes" USING btree ("tenant_id","created_at");