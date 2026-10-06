CREATE TABLE "customer_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_location_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_affiliation_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_affiliation_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"settlement_model" varchar(32) DEFAULT 'CHAIR_RENTAL' NOT NULL,
	"commission_basis_points" integer,
	"fixed_rent_amount_minor" bigint,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"settlement_frequency" varchar(32) DEFAULT 'MONTHLY',
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_workspace_tenant_id" uuid NOT NULL,
	"professional_profile_id" uuid NOT NULL,
	"host_tenant_id" uuid NOT NULL,
	"relationship_type" varchar(32) DEFAULT 'CHAIR_RENTAL' NOT NULL,
	"status" varchar(32) DEFAULT 'REQUESTED' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"requested_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_location_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price_override_minor" bigint,
	"duration_override_minutes" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"professional_slug" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"bio" text,
	"avatar_media_id" varchar(255),
	"phone_public" varchar(50),
	"instagram" varchar(100),
	"tiktok" varchar(100),
	"years_experience" integer,
	"booking_enabled" boolean DEFAULT true NOT NULL,
	"profile_visibility" varchar(32) DEFAULT 'PUBLIC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_profile_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"audience" varchar(32) DEFAULT 'SOLO_PROFESSIONAL' NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"billing_period" varchar(32) DEFAULT 'MONTHLY' NOT NULL,
	"price_minor" bigint,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'TRIALING' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"required_module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'CORE' NOT NULL,
	"status" varchar(32) DEFAULT 'AVAILABLE' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plan_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_module_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"state" varchar(32) NOT NULL,
	"reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'IN_PROGRESS' NOT NULL,
	"payload" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"intended_role" varchar(50),
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tenant_type" varchar(32) DEFAULT 'BUSINESS' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD COLUMN "professional_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_location_scopes" ADD CONSTRAINT "membership_location_scopes_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_location_scopes" ADD CONSTRAINT "membership_location_scopes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliation_locations" ADD CONSTRAINT "professional_affiliation_locations_affiliation_id_professional_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."professional_affiliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliation_locations" ADD CONSTRAINT "professional_affiliation_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliation_terms" ADD CONSTRAINT "professional_affiliation_terms_affiliation_id_professional_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."professional_affiliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliations" ADD CONSTRAINT "professional_affiliations_professional_workspace_tenant_id_tenants_id_fk" FOREIGN KEY ("professional_workspace_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliations" ADD CONSTRAINT "professional_affiliations_professional_profile_id_professional_profiles_id_fk" FOREIGN KEY ("professional_profile_id") REFERENCES "public"."professional_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliations" ADD CONSTRAINT "professional_affiliations_host_tenant_id_tenants_id_fk" FOREIGN KEY ("host_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliations" ADD CONSTRAINT "professional_affiliations_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliations" ADD CONSTRAINT "professional_affiliations_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_location_services" ADD CONSTRAINT "professional_location_services_affiliation_id_professional_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."professional_affiliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_location_services" ADD CONSTRAINT "professional_location_services_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_location_services" ADD CONSTRAINT "professional_location_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_workspaces" ADD CONSTRAINT "professional_workspaces_professional_profile_id_professional_profiles_id_fk" FOREIGN KEY ("professional_profile_id") REFERENCES "public"."professional_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_workspaces" ADD CONSTRAINT "professional_workspaces_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_required_module_id_modules_id_fk" FOREIGN KEY ("required_module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_modules" ADD CONSTRAINT "plan_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_module_overrides" ADD CONSTRAINT "tenant_module_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_module_overrides" ADD CONSTRAINT "tenant_module_overrides_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_module_overrides" ADD CONSTRAINT "tenant_module_overrides_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_onboarding" ADD CONSTRAINT "professional_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_rel_tenant_user_idx" ON "customer_relationships" USING btree ("tenant_id","customer_user_id");--> statement-breakpoint
CREATE INDEX "customer_rel_tenant_idx" ON "customer_relationships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_loc_scope_unique_idx" ON "membership_location_scopes" USING btree ("membership_id","location_id");--> statement-breakpoint
CREATE INDEX "membership_loc_scope_membership_idx" ON "membership_location_scopes" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affil_locations_unique_idx" ON "professional_affiliation_locations" USING btree ("affiliation_id","location_id");--> statement-breakpoint
CREATE INDEX "affil_locations_location_idx" ON "professional_affiliation_locations" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affil_terms_affiliation_idx" ON "professional_affiliation_terms" USING btree ("affiliation_id");--> statement-breakpoint
CREATE INDEX "affiliations_prof_tenant_idx" ON "professional_affiliations" USING btree ("professional_workspace_tenant_id");--> statement-breakpoint
CREATE INDEX "affiliations_host_tenant_idx" ON "professional_affiliations" USING btree ("host_tenant_id");--> statement-breakpoint
CREATE INDEX "affiliations_status_idx" ON "professional_affiliations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "prof_loc_services_unique_idx" ON "professional_location_services" USING btree ("affiliation_id","location_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_profiles_user_id_idx" ON "professional_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_profiles_slug_idx" ON "professional_profiles" USING btree ("professional_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_workspaces_profile_idx" ON "professional_workspaces" USING btree ("professional_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_workspaces_tenant_idx" ON "professional_workspaces" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_plans_code_idx" ON "subscription_plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sub_plans_audience_idx" ON "subscription_plans" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "tenant_sub_tenant_idx" ON "tenant_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_sub_status_idx" ON "tenant_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "module_dep_unique_idx" ON "module_dependencies" USING btree ("module_id","required_module_id");--> statement-breakpoint
CREATE INDEX "module_dep_module_idx" ON "module_dependencies" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "module_perms_unique_idx" ON "module_permissions" USING btree ("module_id","permission_id");--> statement-breakpoint
CREATE INDEX "module_perms_module_idx" ON "module_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_code_idx" ON "modules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "modules_category_idx" ON "modules" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_modules_unique_idx" ON "plan_modules" USING btree ("plan_id","module_id");--> statement-breakpoint
CREATE INDEX "plan_modules_plan_idx" ON "plan_modules" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_overrides_unique_idx" ON "tenant_module_overrides" USING btree ("tenant_id","module_id");--> statement-breakpoint
CREATE INDEX "tenant_overrides_tenant_idx" ON "tenant_module_overrides" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_user_idx" ON "professional_onboarding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_status_idx" ON "professional_onboarding" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_invites_token_hash_idx" ON "user_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_invites_email_idx" ON "user_invites" USING btree ("email");--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_professional_profile_id_professional_profiles_id_fk" FOREIGN KEY ("professional_profile_id") REFERENCES "public"."professional_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_profiles_prof_id_idx" ON "staff_profiles" USING btree ("professional_profile_id");