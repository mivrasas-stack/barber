CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"incurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(32) DEFAULT 'POSTED' NOT NULL,
	"vendor_name" varchar(255),
	"receipt_media_id" varchar(255),
	"journal_entry_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"account_code" varchar(64) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(32) NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_number" varchar(64) NOT NULL,
	"entry_type" varchar(64) NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_id" uuid,
	"description" text NOT NULL,
	"status" varchar(32) DEFAULT 'POSTED' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_entry_id" uuid,
	"reversal_of_entry_id" uuid,
	"created_by_user_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_affiliation_term_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"settlement_model" varchar(32) DEFAULT 'CHAIR_RENTAL' NOT NULL,
	"commission_basis_points" integer,
	"fixed_rent_amount_minor" bigint,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"settlement_frequency" varchar(32) DEFAULT 'MONTHLY',
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"change_reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_tenant_id" uuid NOT NULL,
	"to_tenant_id" uuid NOT NULL,
	"affiliation_id" uuid,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" varchar(32) DEFAULT 'CONFIRMED' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"settlement_type" varchar(32) DEFAULT 'MANUAL' NOT NULL,
	"reference" varchar(100),
	"notes" text,
	"journal_entry_id" uuid,
	"created_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_financial_account_id_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliation_term_versions" ADD CONSTRAINT "professional_affiliation_term_versions_affiliation_id_professional_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."professional_affiliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_affiliation_term_versions" ADD CONSTRAINT "professional_affiliation_term_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_tenant_id_tenants_id_fk" FOREIGN KEY ("from_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_tenant_id_tenants_id_fk" FOREIGN KEY ("to_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_affiliation_id_professional_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."professional_affiliations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exp_cat_tenant_code_idx" ON "expense_categories" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "exp_tenant_incurred_idx" ON "expenses" USING btree ("tenant_id","incurred_at");--> statement-breakpoint
CREATE INDEX "exp_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "fin_acc_tenant_code_curr_idx" ON "financial_accounts" USING btree ("tenant_id","account_code","currency");--> statement-breakpoint
CREATE INDEX "fin_acc_tenant_type_idx" ON "financial_accounts" USING btree ("tenant_id","account_type");--> statement-breakpoint
CREATE INDEX "fin_acc_code_idx" ON "financial_accounts" USING btree ("account_code");--> statement-breakpoint
CREATE UNIQUE INDEX "je_source_unique_posted_idx" ON "journal_entries" USING btree ("tenant_id","source_type","source_id","entry_type") WHERE status = 'POSTED' AND source_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "je_tenant_occurred_idx" ON "journal_entries" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "je_entry_number_idx" ON "journal_entries" USING btree ("entry_number");--> statement-breakpoint
CREATE INDEX "je_source_idx" ON "journal_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "jl_entry_idx" ON "journal_lines" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "jl_account_created_idx" ON "journal_lines" USING btree ("financial_account_id","created_at");--> statement-breakpoint
CREATE INDEX "jl_tenant_created_idx" ON "journal_lines" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "affil_term_versions_affil_idx" ON "professional_affiliation_term_versions" USING btree ("affiliation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affil_term_versions_num_idx" ON "professional_affiliation_term_versions" USING btree ("affiliation_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "je_reversal_of_unique_idx" ON "journal_entries" USING btree ("reversal_of_entry_id") WHERE status = 'POSTED' AND reversal_of_entry_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "settle_from_to_idx" ON "settlements" USING btree ("from_tenant_id","to_tenant_id");--> statement-breakpoint
CREATE INDEX "settle_affiliation_idx" ON "settlements" USING btree ("affiliation_id");--> statement-breakpoint
CREATE INDEX "settle_status_idx" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "settle_affil_period_type_idx" ON "settlements" USING btree ("affiliation_id","period_start","settlement_type") WHERE status != 'CANCELLED' AND affiliation_id IS NOT NULL AND period_start IS NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_affiliation_term_versions" ADD CONSTRAINT "affiliation_terms_no_overlap"
EXCLUDE USING gist (
    "affiliation_id" WITH =,
    tstzrange("effective_from", coalesce("effective_until", 'infinity'::timestamptz), '[)') WITH &&
);