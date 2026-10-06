import { pgTable, uuid, varchar, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const professionalOnboarding = pgTable(
  "professional_onboarding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(1),
    status: varchar("status", { length: 32 }).notNull().default("IN_PROGRESS"), // IN_PROGRESS, COMPLETED, ABANDONED
    payload: jsonb("payload"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("onboarding_user_idx").on(table.userId),
    index("onboarding_status_idx").on(table.status),
  ]
);

export const userInvites = pgTable(
  "user_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    intendedRole: varchar("intended_role", { length: 50 }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"), // PENDING, ACCEPTED, EXPIRED, CANCELLED
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_invites_token_hash_idx").on(table.tokenHash),
    index("user_invites_email_idx").on(table.email),
  ]
);

export type ProfessionalOnboardingRow = typeof professionalOnboarding.$inferSelect;
export type NewProfessionalOnboardingRow = typeof professionalOnboarding.$inferInsert;
export type UserInviteRow = typeof userInvites.$inferSelect;
export type NewUserInviteRow = typeof userInvites.$inferInsert;
