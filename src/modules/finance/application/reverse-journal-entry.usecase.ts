import { IFinanceRepository } from "../domain/finance-repository.interface";
import { JournalEntry } from "../domain/journal-entry";
import { JournalEntryNotFoundError } from "../domain/finance-errors";
import { ForbiddenError } from "@/shared/errors/app-error";

export interface ReverseJournalEntryInput {
  journalEntryId: string;
  tenantId: string;
  actorUserId: string;
  reason: string;
  allowClawbackAdjustment?: boolean;
}

export class ReverseJournalEntryUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: ReverseJournalEntryInput): Promise<JournalEntry> {
    const entry = await this.financeRepository.findJournalEntryById(input.journalEntryId);
    if (!entry) {
      throw new JournalEntryNotFoundError(input.journalEntryId);
    }
    if (entry.tenantId !== input.tenantId) {
      throw new ForbiddenError("Access denied: Tenant mismatch on journal entry.");
    }

    return this.financeRepository.reverseJournalEntry(
      input.journalEntryId,
      input.actorUserId,
      input.reason,
      { allowClawbackAdjustment: input.allowClawbackAdjustment }
    );
  }
}
