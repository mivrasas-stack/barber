import { pgTable, uuid, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailNormalized: varchar("email_normalized", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"), // ACTIVE, SUSPENDED, DISABLED
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
