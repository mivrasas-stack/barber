CREATE TABLE "inventory_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"seller_tenant_id" uuid NOT NULL,
	"service_id" uuid,
	"appointment_service_id" uuid,
	"product_variant_id" uuid,
	"professional_profile_id" uuid,
	"description_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(100),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"unit_cost_minor" bigint,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_tenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" varchar(32) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"amount_received_minor" bigint,
	"change_due_minor" bigint,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"reference" varchar(100),
	"declared_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(64) NOT NULL,
	"context_tenant_id" uuid NOT NULL,
	"location_id" uuid,
	"customer_user_id" uuid,
	"customer_name_snapshot" varchar(255),
	"customer_email_snapshot" varchar(255),
	"customer_phone_snapshot" varchar(50),
	"appointment_id" uuid,
	"status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"subtotal_minor" bigint DEFAULT 0 NOT NULL,
	"discount_total_minor" bigint DEFAULT 0 NOT NULL,
	"tax_total_minor" bigint DEFAULT 0 NOT NULL,
	"tip_total_minor" bigint DEFAULT 0 NOT NULL,
	"grand_total_minor" bigint DEFAULT 0 NOT NULL,
	"collector_party" varchar(32) DEFAULT 'COLLECTED_BY_HOST' NOT NULL,
	"notes" text,
	"created_by_user_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"name" varchar(255) NOT NULL,
	"price_minor" bigint NOT NULL,
	"cost_minor" bigint,
	"currency" char(3) DEFAULT 'COP' NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"reorder_point" integer DEFAULT 5,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"brand" varchar(255),
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"default_tax_category" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"movement_type" varchar(64) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_minor" bigint,
	"currency" char(3) DEFAULT 'COP',
	"source_type" varchar(64) NOT NULL,
	"source_id" uuid,
	"correlation_id" varchar(128),
	"reason" text,
	"created_by_user_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inventory_positions_owner_tenant_id_tenants_id_fk" FOREIGN KEY ("owner_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inventory_positions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inventory_positions_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_tenant_id_tenants_id_fk" FOREIGN KEY ("seller_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_appointment_service_id_appointment_services_id_fk" FOREIGN KEY ("appointment_service_id") REFERENCES "public"."appointment_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_professional_profile_id_professional_profiles_id_fk" FOREIGN KEY ("professional_profile_id") REFERENCES "public"."professional_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tenders" ADD CONSTRAINT "order_tenders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_tenders" ADD CONSTRAINT "order_tenders_declared_by_user_id_users_id_fk" FOREIGN KEY ("declared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_context_tenant_id_tenants_id_fk" FOREIGN KEY ("context_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_owner_tenant_id_tenants_id_fk" FOREIGN KEY ("owner_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_owner_tenant_id_tenants_id_fk" FOREIGN KEY ("owner_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inv_pos_owner_loc_variant_idx" ON "inventory_positions" USING btree ("owner_tenant_id","location_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "inv_pos_owner_loc_idx" ON "inventory_positions" USING btree ("owner_tenant_id","location_id");--> statement-breakpoint
CREATE INDEX "inv_pos_variant_idx" ON "inventory_positions" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_seller_idx" ON "order_items" USING btree ("seller_tenant_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("product_variant_id");--> statement-breakpoint
CREATE INDEX "order_items_service_idx" ON "order_items" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "order_tenders_order_idx" ON "order_tenders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_context_loc_opened_idx" ON "orders" USING btree ("context_tenant_id","location_id","opened_at");--> statement-breakpoint
CREATE INDEX "orders_customer_opened_idx" ON "orders" USING btree ("customer_user_id","opened_at");--> statement-breakpoint
CREATE INDEX "orders_appointment_idx" ON "orders" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "prod_cat_tenant_slug_idx" ON "product_categories" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "prod_cat_status_idx" ON "product_categories" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "pv_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pv_barcode_idx" ON "product_variants" USING btree ("barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "products_owner_slug_idx" ON "products" USING btree ("owner_tenant_id","slug");--> statement-breakpoint
CREATE INDEX "products_owner_status_idx" ON "products" USING btree ("owner_tenant_id","status");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sm_owner_loc_occurred_idx" ON "stock_movements" USING btree ("owner_tenant_id","location_id","occurred_at");--> statement-breakpoint
CREATE INDEX "sm_variant_occurred_idx" ON "stock_movements" USING btree ("product_variant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "sm_source_idx" ON "stock_movements" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "sm_correlation_idx" ON "stock_movements" USING btree ("correlation_id");--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inv_pos_on_hand_non_negative" CHECK ("on_hand" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inv_pos_reserved_non_negative" CHECK ("reserved" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_positions" ADD CONSTRAINT "inv_pos_reserved_le_on_hand" CHECK ("reserved" <= "on_hand");