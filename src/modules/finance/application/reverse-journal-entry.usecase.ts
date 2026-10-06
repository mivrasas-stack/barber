import { IFinanceRepository } from "../domain/finance-repository.interface";
import { JournalEntry } from "../domain/journal-entry";

export interface ReverseJournalEntryInput {
  journalEntryId: string;
  tenantId: string;
  actorUserId: string;
  reason: string;
}

export class ReverseJournalEntryUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: ReverseJournalEntryInput): Promise<JournalEntry> {
    const entry = await this.financeRepository.findJournalEntryById(input.journalEntryId);
    if (!entry) {
      throw new Error(`Journal entry ${input.journalEntryId} not found.`);
    }
    if (entry.tenantId !== input.tenantId) {
      throw new Error("Access denied: Tenant mismatch on journal entry.");
    }

    return this.financeRepository.reverseJournalEntry(
      input.journalEntryId,
      input.actorUserId,
      input.reason
    );
  }
}
