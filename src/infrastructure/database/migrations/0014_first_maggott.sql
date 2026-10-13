CREATE TABLE "customer_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" varchar(32) DEFAULT 'PUBLISHED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_favorite_owner_target_uq" ON "customer_favorites" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "customer_favorite_tenant_idx" ON "customer_favorites" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_review_appointment_target_uq" ON "customer_reviews" USING btree ("appointment_id","target_type");--> statement-breakpoint
CREATE INDEX "customer_review_tenant_created_idx" ON "customer_reviews" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_review_user_idx" ON "customer_reviews" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_review_stars_valid" CHECK ("rating" BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_review_target_valid" CHECK ("target_type" IN ('TENANT','STAFF'));
--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorite_target_valid" CHECK ("target_type" IN ('TENANT','STAFF'));
