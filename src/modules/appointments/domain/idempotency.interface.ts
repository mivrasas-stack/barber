export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  userId: string;
  key: string;
  operation: string;
  requestHash: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  responseCode?: number | null;
  responseBody?: unknown;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateIdempotencyInput {
  tenantId: string;
  userId: string;
  key: string;
  operation: string;
  requestHash: string;
  expiresAt: Date;
}

export interface IdempotencyRepository {
  find(
    tenantId: string,
    userId: string,
    operation: string,
    key: string
  ): Promise<IdempotencyRecord | null>;
  create(input: CreateIdempotencyInput): Promise<IdempotencyRecord>;
  complete(id: string, responseCode: number, responseBody: unknown): Promise<void>;
  fail(id: string): Promise<void>;
}
