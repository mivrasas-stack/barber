import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { idempotencyKeys, IdempotencyKeyRow } from "@/infrastructure/database/schema/idempotency";
import {
  IdempotencyRecord,
  CreateIdempotencyInput,
  IdempotencyRepository,
} from "../domain/idempotency.interface";

export class DrizzleIdempotencyRepository implements IdempotencyRepository {
  private toDomain(row: IdempotencyKeyRow): IdempotencyRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      key: row.key,
      operation: row.operation,
      requestHash: row.requestHash,
      status: row.status as "PROCESSING" | "COMPLETED" | "FAILED",
      responseCode: row.responseCode,
      responseBody: row.responseBody,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }

  async find(
    tenantId: string,
    userId: string,
    operation: string,
    key: string
  ): Promise<IdempotencyRecord | null> {
    const rows = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.tenantId, tenantId),
          eq(idempotencyKeys.userId, userId),
          eq(idempotencyKeys.operation, operation),
          eq(idempotencyKeys.key, key)
        )
      )
      .limit(1);

    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async create(input: CreateIdempotencyInput): Promise<IdempotencyRecord> {
    const [row] = await db
      .insert(idempotencyKeys)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        key: input.key,
        operation: input.operation,
        requestHash: input.requestHash,
        status: "PROCESSING",
        expiresAt: input.expiresAt,
      })
      .returning();

    return this.toDomain(row);
  }

  async complete(id: string, responseCode: number, responseBody: unknown): Promise<void> {
    await db
      .update(idempotencyKeys)
      .set({
        status: "COMPLETED",
        responseCode,
        responseBody,
      })
      .where(eq(idempotencyKeys.id, id));
  }

  async fail(id: string): Promise<void> {
    await db
      .update(idempotencyKeys)
      .set({
        status: "FAILED",
      })
      .where(eq(idempotencyKeys.id, id));
  }
}
