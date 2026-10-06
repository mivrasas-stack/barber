import { AppError } from "@/shared/errors/app-error";

export class FinancialEntryUnbalancedError extends AppError {
  readonly statusCode = 422;
  readonly code = "FINANCIAL_ENTRY_UNBALANCED";
  constructor(message = "Total debits must equal total credits in a journal entry") {
    super(message);
  }
}

export class UnbalancedJournalEntryError extends FinancialEntryUnbalancedError {
  constructor(entryNumber?: string, debits?: string, credits?: string) {
    super(
      `Unbalanced journal entry ${entryNumber ?? ""}: total debits (${debits ?? ""}) must equal total credits (${credits ?? ""})`
    );
  }
}

export class FinancialEntryAlreadyPostedError extends AppError {
  readonly statusCode = 409;
  readonly code = "FINANCIAL_ENTRY_ALREADY_POSTED";
  constructor(message = "Journal entry is already posted and cannot be modified") {
    super(message);
  }
}

export class FinancialEntryAlreadyReversedError extends AppError {
  readonly statusCode = 409;
  readonly code = "FINANCIAL_ENTRY_ALREADY_REVERSED";
  constructor(message = "Journal entry is already reversed") {
    super(message);
  }
}

export class JournalEntryAlreadyReversedError extends FinancialEntryAlreadyReversedError {
  constructor(identifier?: string) {
    super(`Journal entry ${identifier ?? ""} is already reversed.`);
  }
}

export class FinancialSourceAlreadyPostedError extends AppError {
  readonly statusCode = 409;
  readonly code = "FINANCIAL_SOURCE_ALREADY_POSTED";
  constructor(message = "A financial journal entry for this source operation has already been posted") {
    super(message);
  }
}

export class DuplicateJournalEntryError extends FinancialSourceAlreadyPostedError {
  constructor(sourceType?: string, sourceId?: string, existingEntryNumber?: string) {
    super(
      `A journal entry for source ${sourceType}:${sourceId} is already posted with number ${existingEntryNumber}`
    );
  }
}

export class JournalEntryNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "JOURNAL_ENTRY_NOT_FOUND";
  constructor(identifier?: string) {
    super(`Journal entry ${identifier ?? ""} not found.`);
  }
}

export class FinancialAccountNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "FINANCIAL_ACCOUNT_NOT_FOUND";
  constructor(accountCode?: string, tenantId?: string) {
    super(`Financial account '${accountCode ?? ""}' not found for tenant '${tenantId ?? ""}'.`);
  }
}

export class InvalidJournalLineError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_JOURNAL_LINE";
  constructor(message = "Journal line is invalid") {
    super(message);
  }
}

export class CrossTenantSettlementError extends AppError {
  readonly statusCode = 400;
  readonly code = "CROSS_TENANT_SETTLEMENT_ERROR";
  constructor(message = "Cross tenant settlement error") {
    super(message);
  }
}

export class InvalidFinancialAmountError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_FINANCIAL_AMOUNT";
  constructor(message = "Financial amount must be a positive integer greater than zero") {
    super(message);
  }
}

export class CurrencyMismatchError extends AppError {
  readonly statusCode = 400;
  readonly code = "CURRENCY_MISMATCH";
  constructor(expectedOrMsg?: string, received?: string) {
    super(
      received
        ? `Currency mismatch: expected ${expectedOrMsg}, but got ${received}`
        : (expectedOrMsg ?? "Cannot mix different currencies within the same financial journal entry or operation")
    );
  }
}

export class ExpenseNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "EXPENSE_NOT_FOUND";
  constructor(identifier?: string) {
    super(`Expense${identifier ? ` with identifier '${identifier}'` : ""} not found`);
  }
}

export class SettlementNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "SETTLEMENT_NOT_FOUND";
  constructor(identifier?: string) {
    super(`Settlement${identifier ? ` with identifier '${identifier}'` : ""} not found`);
  }
}

export class SettlementExceedsOutstandingError extends AppError {
  readonly statusCode = 422;
  readonly code = "SETTLEMENT_EXCEEDS_OUTSTANDING";
  constructor(message = "Settlement amount exceeds outstanding unsettled obligation balance") {
    super(message);
  }
}

export class SettlementAlreadyConfirmedError extends AppError {
  readonly statusCode = 409;
  readonly code = "SETTLEMENT_ALREADY_CONFIRMED";
  constructor(message = "Settlement is already confirmed") {
    super(message);
  }
}

export class AffiliationTermsNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "AFFILIATION_TERMS_NOT_FOUND";
  constructor(message = "Active commercial affiliation terms not found for this relationship") {
    super(message);
  }
}

export class FinanceModuleDisabledError extends AppError {
  readonly statusCode = 403;
  readonly code = "FINANCE_MODULE_DISABLED";
  constructor(message = "Financial modules are not entitled or not enabled for this workspace") {
    super(message);
  }
}
