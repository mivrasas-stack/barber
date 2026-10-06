import { IFinanceRepository, LedgerFilter } from "../domain/finance-repository.interface";
import { JournalEntry } from "../domain/journal-entry";

export class GetLedgerEntriesUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(filter: LedgerFilter): Promise<{ entries: JournalEntry[]; total: number }> {
    return this.financeRepository.getLedgerEntries(filter);
  }
}
