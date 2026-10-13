import type { ClaimBatchInput, ClaimBatchResult, MarkFailedInput, SettleResult } from "./types";

export interface OutboxRepository {
  claimBatch(input: ClaimBatchInput): Promise<ClaimBatchResult>;
  renewLease(
    id: string,
    workerId: string,
    leaseDurationMs: number,
    now?: Date
  ): Promise<boolean>;
  markPublished(id: string, workerId: string, publishedAt?: Date): Promise<SettleResult>;
  markFailed(input: MarkFailedInput): Promise<SettleResult>;
}
