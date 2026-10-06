import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { users, UserRow } from "@/infrastructure/database/schema/users";
import { User, UserId } from "../domain/user";
import { CreateUserInput, UserRepository } from "../domain/user-repository.interface";
import { ConflictError } from "@/shared/errors/app-error";

export class DrizzleUserRepository implements UserRepository {
  private toDomain(row: UserRow): User {
    return new User({
      id: row.id,
      email: row.email,
      emailNormalized: row.emailNormalized,
      name: row.name,
      passwordHash: row.passwordHash,
      emailVerifiedAt: row.emailVerifiedAt,
      status: row.status as "ACTIVE" | "SUSPENDED" | "DISABLED",
      isPlatformAdmin: row.isPlatformAdmin,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = User.normalizeEmail(email);
    const rows = await db.select().from(users).where(eq(users.emailNormalized, normalized)).limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async create(input: CreateUserInput): Promise<User> {
    const normalized = User.normalizeEmail(input.email);
    const existing = await this.findByEmail(normalized);
    if (existing) {
      throw new ConflictError(`User with email '${input.email}' already exists`);
    }

    const [row] = await db
      .insert(users)
      .values({
        email: input.email.trim(),
        emailNormalized: normalized,
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        isPlatformAdmin: input.isPlatformAdmin ?? false,
      })
      .returning();

    return this.toDomain(row);
  }

  async updateLastLogin(id: UserId): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }
}
