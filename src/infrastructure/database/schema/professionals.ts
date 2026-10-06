import { pgTable, uuid, varchar, text, integer, bigint, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";
import { locations } from "./locations";
import { services } from "./services";
import { memberships } from "./memberships";

export const professionalProfiles = pgTable(
  "professional_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    professionalSlug: varchar("professional_slug", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    bio: text("bio"),
    avatarMediaId: varchar("avatar_media_id", { length: 255 }),
    phonePublic: varchar("phone_public", { length: 50 }),
    instagram: varchar("instagram", { length: 100 }),
    tiktok: varchar("tiktok", { length: 100 }),
    yearsExperience: integer("years_experience"),
    bookingEnabled: boolean("booking_enabled").notNull().default(true),
    profileVisibility: varchar("profile_visibility", { length: 32 }).notNull().default("PUBLIC"), // PUBLIC, UNLISTED, PRIVATE
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("professional_profiles_user_id_idx").on(table.userId),
    uniqueIndex("professional_profiles_slug_idx").on(table.professionalSlug),
  ]
);

export const professionalWorkspaces = pgTable(
  "professional_workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalProfileId: uuid("professional_profile_id")
      .notNull()
      .references(() => professionalProfiles.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, SUSPENDED
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("professional_workspaces_profile_idx").on(table.professionalProfileId),
    uniqueIndex("professional_workspaces_tenant_idx").on(table.tenantId),
  ]
);

export const professionalAffiliations = pgTable(
  "professional_affiliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    professionalWorkspaceTenantId: uuid("professional_workspace_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    professionalProfileId: uuid("professional_profile_id")
      .notNull()
      .references(() => professionalProfiles.id, { onDelete: "cascade" }),
    hostTenantId: uuid("host_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 32 }).notNull().default("CHAIR_RENTAL"), // CHAIR_RENTAL, COMMISSION, HYBRID, CONTRACTOR, GUEST
    status: varchar("status", { length: 32 }).notNull().default("REQUESTED"), // REQUESTED, INVITED, ACTIVE, SUSPENDED, REJECTED, ENDED
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("affiliations_prof_tenant_idx").on(table.professionalWorkspaceTenantId),
    index("affiliations_host_tenant_idx").on(table.hostTenantId),
    index("affiliations_status_idx").on(table.status),
  ]
);

export const professionalAffiliationLocations = pgTable(
  "professional_affiliation_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliationId: uuid("affiliation_id")
      .notNull()
      .references(() => professionalAffiliations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("affil_locations_unique_idx").on(table.affiliationId, table.locationId),
    index("affil_locations_location_idx").on(table.locationId),
  ]
);

export const professionalAffiliationTerms = pgTable(
  "professional_affiliation_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliationId: uuid("affiliation_id")
      .notNull()
      .references(() => professionalAffiliations.id, { onDelete: "cascade" }),
    settlementModel: varchar("settlement_model", { length: 32 }).notNull().default("CHAIR_RENTAL"),
    commissionBasisPoints: integer("commission_basis_points"), // e.g. 2000 = 20.00%
    fixedRentAmountMinor: bigint("fixed_rent_amount_minor", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).notNull().default("COP"),
    settlementFrequency: varchar("settlement_frequency", { length: 32 }).default("MONTHLY"), // WEEKLY, BIWEEKLY, MONTHLY
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("affil_terms_affiliation_idx").on(table.affiliationId),
  ]
);

export const professionalLocationServices = pgTable(
  "professional_location_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliationId: uuid("affiliation_id")
      .notNull()
      .references(() => professionalAffiliations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    priceOverrideMinor: bigint("price_override_minor", { mode: "number" }),
    durationOverrideMinutes: integer("duration_override_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prof_loc_services_unique_idx").on(table.affiliationId, table.locationId, table.serviceId),
  ]
);

export const customerRelationships = pgTable(
  "customer_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerUserId: uuid("customer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_rel_tenant_user_idx").on(table.tenantId, table.customerUserId),
    index("customer_rel_tenant_idx").on(table.tenantId),
  ]
);

export const membershipLocationScopes = pgTable(
  "membership_location_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_loc_scope_unique_idx").on(table.membershipId, table.locationId),
    index("membership_loc_scope_membership_idx").on(table.membershipId),
  ]
);

export type ProfessionalProfileRow = typeof professionalProfiles.$inferSelect;
export type NewProfessionalProfileRow = typeof professionalProfiles.$inferInsert;
export type ProfessionalWorkspaceRow = typeof professionalWorkspaces.$inferSelect;
export type NewProfessionalWorkspaceRow = typeof professionalWorkspaces.$inferInsert;
export type ProfessionalAffiliationRow = typeof professionalAffiliations.$inferSelect;
export type NewProfessionalAffiliationRow = typeof professionalAffiliations.$inferInsert;
export type ProfessionalAffiliationLocationRow = typeof professionalAffiliationLocations.$inferSelect;
export type NewProfessionalAffiliationLocationRow = typeof professionalAffiliationLocations.$inferInsert;
export type ProfessionalAffiliationTermRow = typeof professionalAffiliationTerms.$inferSelect;
export type NewProfessionalAffiliationTermRow = typeof professionalAffiliationTerms.$inferInsert;
export type ProfessionalLocationServiceRow = typeof professionalLocationServices.$inferSelect;
export type NewProfessionalLocationServiceRow = typeof professionalLocationServices.$inferInsert;
export type CustomerRelationshipRow = typeof customerRelationships.$inferSelect;
export type NewCustomerRelationshipRow = typeof customerRelationships.$inferInsert;
export type MembershipLocationScopeRow = typeof membershipLocationScopes.$inferSelect;
export type NewMembershipLocationScopeRow = typeof membershipLocationScopes.$inferInsert;
