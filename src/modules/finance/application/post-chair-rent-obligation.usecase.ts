import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/infrastructure/database/client";
import {
  professionalAffiliations,
  professionalAffiliationTerms,
} from "@/infrastructure/database/schema/professionals";
import { settlements } from "@/infrastructure/database/schema/finance";
import { IFinanceRepository } from "../domain/finance-repository.interface";
import { JournalEntry } from "../domain/journal-entry";
import { JournalLine } from "../domain/journal-line";
import { Money } from "../domain/money";
import { STANDARD_ACCOUNT_CODES } from "../domain/financial-account";
import {
  NotFoundError,
  ConflictError,
} from "@/shared/errors/app-error";

export function generateDeterministicUuid(namespace: string, key: string): string {
  const hash = crypto.createHash("sha256").update(`${namespace}:${key}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export interface PostChairRentObligationInput {
  affiliationId: string;
  period: string; // e.g. "2026-10"
  periodStart: Date;
  periodEnd: Date;
  amountMinor?: bigint | number;
  actorUserId?: string | null;
  tx?: any;
}

export interface PostChairRentObligationResult {
  obligationId: string;
  hostJournalEntry: JournalEntry;
  professionalJournalEntry: JournalEntry;
  amount: Money;
  isIdempotentReplay: boolean;
}

export class PostChairRentObligationUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: PostChairRentObligationInput): Promise<PostChairRentObligationResult> {
    const client = input.tx ?? db;

    // 1. Fetch affiliation & terms
    const [affil] = await client
      .select()
      .from(professionalAffiliations)
      .where(eq(professionalAffiliations.id, input.affiliationId))
      .limit(1);

    if (!affil) {
      throw new NotFoundError("Affiliation", input.affiliationId);
    }

    const [terms] = await client
      .select()
      .from(professionalAffiliationTerms)
      .where(eq(professionalAffiliationTerms.affiliationId, affil.id))
      .limit(1);

    if (!terms) {
      throw new NotFoundError("AffiliationTerms", input.affiliationId);
    }

    const currency = terms.currency.toUpperCase();
    const rentAmountMinor = input.amountMinor
      ? BigInt(input.amountMinor)
      : terms.fixedRentAmountMinor
        ? BigInt(terms.fixedRentAmountMinor)
        : BigInt(0);

    if (rentAmountMinor <= BigInt(0)) {
      throw new Error("Fixed chair rent amount must be greater than zero.");
    }

    const rentMoney = Money.fromMinor(rentAmountMinor, currency);
    const obligationId = generateDeterministicUuid("CHAIR_RENT", `${affil.id}:${input.period}`);

    // Check existing host entry for idempotency
    const existingHostEntry = await this.financeRepository.findJournalEntryBySource(
      "SETTLEMENT",
      obligationId,
      "CHAIR_RENT_OBLIGATION",
      affil.hostTenantId,
      client
    );

    if (existingHostEntry) {
      const existingProfEntry = await this.financeRepository.findJournalEntryBySource(
        "SETTLEMENT",
        obligationId,
        "CHAIR_RENT_OBLIGATION",
        affil.professionalWorkspaceTenantId,
        client
      );

      return {
        obligationId,
        hostJournalEntry: existingHostEntry,
        professionalJournalEntry: existingProfEntry!,
        amount: rentMoney,
        isIdempotentReplay: true,
      };
    }

    // Wrap in transaction for atomic dual posting and settlement record creation
    const runInTx = async (trx: any) => {
      // 1. Host Accounts
      const hostAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
        affil.hostTenantId,
        currency,
        trx
      );
      const hostRentRecAcc =
        hostAccounts.get(STANDARD_ACCOUNT_CODES.HOST_CHAIR_RENT_RECEIVABLE) ??
        hostAccounts.get(STANDARD_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)!;
      const hostRentRevAcc =
        hostAccounts.get(STANDARD_ACCOUNT_CODES.CHAIR_RENT_REVENUE) ??
        hostAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)!;

      // Host Entry: DEBIT Chair Rent Receivable, CREDIT Chair Rent Revenue
      const hostJe = new JournalEntry({
        tenantId: affil.hostTenantId,
        entryNumber: `JE-RENT-HOST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entryType: "CHAIR_RENT_OBLIGATION",
        currency,
        sourceType: "SETTLEMENT",
        sourceId: obligationId,
        description: `Periodic chair rent obligation for ${input.period}`,
        createdByUserId: input.actorUserId,
        metadata: {
          correlationId: obligationId,
          financialOperationId: `op_rent_${obligationId}`,
          counterpartyTenantId: affil.professionalWorkspaceTenantId,
          affiliationId: affil.id,
          period: input.period,
          amountMinor: rentMoney.minorUnitsString,
        },
        lines: [
          new JournalLine({
            financialAccountId: hostRentRecAcc.id,
            tenantId: affil.hostTenantId,
            direction: "DEBIT",
            amount: rentMoney,
            memo: `Chair rent receivable for period ${input.period}`,
          }),
          new JournalLine({
            financialAccountId: hostRentRevAcc.id,
            tenantId: affil.hostTenantId,
            direction: "CREDIT",
            amount: rentMoney,
            memo: `Chair rent revenue for period ${input.period}`,
          }),
        ],
      });

      const postedHostJe = await this.financeRepository.postJournalEntry(hostJe, trx);

      // 2. Professional Accounts
      const profAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
        affil.professionalWorkspaceTenantId,
        currency,
        trx
      );
      const profRentExpAcc =
        profAccounts.get(STANDARD_ACCOUNT_CODES.CHAIR_RENT_EXPENSE) ??
        profAccounts.get(STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE)!;
      const profRentPayAcc =
        profAccounts.get(STANDARD_ACCOUNT_CODES.HOST_COMMISSION_PAYABLE) ??
        profAccounts.get(STANDARD_ACCOUNT_CODES.SETTLEMENT_CLEARING)!;

      // Professional Entry: DEBIT Chair Rent Expense, CREDIT Host Rent Payable
      const profJe = new JournalEntry({
        tenantId: affil.professionalWorkspaceTenantId,
        entryNumber: `JE-RENT-PROF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entryType: "CHAIR_RENT_OBLIGATION",
        currency,
        sourceType: "SETTLEMENT",
        sourceId: obligationId,
        description: `Chair rent obligation for ${input.period}`,
        createdByUserId: input.actorUserId,
        metadata: {
          correlationId: obligationId,
          financialOperationId: `op_rent_${obligationId}`,
          counterpartyTenantId: affil.hostTenantId,
          affiliationId: affil.id,
          period: input.period,
          amountMinor: rentMoney.minorUnitsString,
        },
        lines: [
          new JournalLine({
            financialAccountId: profRentExpAcc.id,
            tenantId: affil.professionalWorkspaceTenantId,
            direction: "DEBIT",
            amount: rentMoney,
            memo: `Chair rent expense for period ${input.period}`,
          }),
          new JournalLine({
            financialAccountId: profRentPayAcc.id,
            tenantId: affil.professionalWorkspaceTenantId,
            direction: "CREDIT",
            amount: rentMoney,
            memo: `Chair rent payable to host for period ${input.period}`,
          }),
        ],
      });

      const postedProfJe = await this.financeRepository.postJournalEntry(profJe, trx);

      // 3. Record Obligation in Settlements Table with status PENDING
      await trx.insert(settlements).values({
        id: obligationId,
        fromTenantId: affil.professionalWorkspaceTenantId,
        toTenantId: affil.hostTenantId,
        affiliationId: affil.id,
        currency,
        amountMinor: rentMoney.amountMinor,
        status: "PENDING",
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        settlementType: "CHAIR_RENT",
        reference: `RENT-${input.period}`,
        notes: `Periodic chair rent obligation for ${input.period}`,
        journalEntryId: postedHostJe.id,
        createdByUserId: input.actorUserId,
      });

      return {
        obligationId,
        hostJournalEntry: postedHostJe,
        professionalJournalEntry: postedProfJe,
        amount: rentMoney,
        isIdempotentReplay: false,
      };
    };

    try {
      if (input.tx) {
        return await runInTx(input.tx);
      }
      return await db.transaction(runInTx);
    } catch (err: any) {
      const errStr = String(err?.message || "") + String(err?.detail || "") + String(err?.code || "");
      if (
        errStr.includes("23505") ||
        errStr.includes("unique") ||
        errStr.includes("settle_affil_period_type_idx") ||
        errStr.includes("je_source_unique_posted_idx")
      ) {
        const existingHost = await this.financeRepository.findJournalEntryBySource(
          "SETTLEMENT",
          obligationId,
          "CHAIR_RENT_OBLIGATION",
          affil.hostTenantId,
          client
        );
        const existingProf = await this.financeRepository.findJournalEntryBySource(
          "SETTLEMENT",
          obligationId,
          "CHAIR_RENT_OBLIGATION",
          affil.professionalWorkspaceTenantId,
          client
        );

        if (existingHost && existingProf) {
          return {
            obligationId,
            hostJournalEntry: existingHost,
            professionalJournalEntry: existingProf,
            amount: rentMoney,
            isIdempotentReplay: true,
          };
        }

        throw new ConflictError(
          `CHAIR_RENT_OBLIGATION_ALREADY_EXISTS: Obligation for affiliation ${affil.id} and period ${input.period} already exists.`
        );
      }
      throw err;
    }
  }
}
