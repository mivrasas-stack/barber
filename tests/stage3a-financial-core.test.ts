import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { pool, db } from "@/infrastructure/database/client";
import { Money } from "@/modules/finance/domain/money";
import { JournalLine } from "@/modules/finance/domain/journal-line";
import { JournalEntry } from "@/modules/finance/domain/journal-entry";
import { FinancialAccount, STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";
import { SettlementPolicy } from "@/modules/finance/domain/settlement-policy";
import { Expense } from "@/modules/finance/domain/expense";
import { Settlement } from "@/modules/finance/domain/settlement";
import {
  UnbalancedJournalEntryError,
  InvalidJournalLineError,
  CurrencyMismatchError,
  JournalEntryAlreadyReversedError,
  CrossTenantSettlementError,
} from "@/modules/finance/domain/finance-errors";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { RecordExpenseUseCase } from "@/modules/finance/application/record-expense.usecase";
import { ReverseExpenseUseCase } from "@/modules/finance/application/reverse-expense.usecase";
import { CreateSettlementUseCase } from "@/modules/finance/application/create-settlement.usecase";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary.usecase";
import { PostServiceRevenueUseCase } from "@/modules/finance/application/post-service-revenue.usecase";
import { DrizzleTenantRepository } from "@/modules/tenancy/infrastructure/drizzle-tenant.repository";
import { DrizzleUserRepository } from "@/modules/identity/infrastructure/drizzle-user.repository";
import { PasswordHasher } from "@/modules/identity/infrastructure/password-hasher";
import { appointments, appointmentServices } from "@/infrastructure/database/schema/appointments";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import { memberships } from "@/infrastructure/database/schema/memberships";
import {
  professionalProfiles,
  professionalWorkspaces,
  professionalAffiliations,
  professionalAffiliationTerms,
} from "@/infrastructure/database/schema/professionals";
import { services } from "@/infrastructure/database/schema/services";
import { locations } from "@/infrastructure/database/schema/locations";
import crypto from "crypto";

describe("Barber Paradise v2 - Stage 3A Financial Core & Double-Entry Ledger", () => {
  const financeRepo = new DrizzleFinanceRepository();
  const tenantRepo = new DrizzleTenantRepository();
  const userRepo = new DrizzleUserRepository();

  const testSuffix = crypto.randomUUID().slice(0, 8);
  let hostTenantId: string;
  let hostLocationId: string;
  let soloTenantId: string;
  let testUserId: string;
  let professionalProfileId: string;
  let affiliationId: string;

  beforeAll(async () => {
    // Create Host Shop Tenant
    const hostTenant = await tenantRepo.create({
      slug: `host-shop-${testSuffix}`,
      name: `Host Barber Shop ${testSuffix}`,
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    });
    hostTenantId = hostTenant.id;

    // Create Host Location
    const [loc] = await db
      .insert(locations)
      .values({
        tenantId: hostTenantId,
        slug: `host-loc-${testSuffix}`,
        name: `Host Main Location ${testSuffix}`,
        address: "Calle 100 # 15-20, Bogota",
        timezone: "America/Bogota",
        currency: "COP",
      })
      .returning();
    hostLocationId = loc.id;

    // Create Solo Professional Workspace Tenant
    const soloTenant = await tenantRepo.create({
      slug: `solo-pro-${testSuffix}`,
      name: `Carlos Solo Studio ${testSuffix}`,
      tenantType: "SOLO_PROFESSIONAL",
      defaultCurrency: "COP",
      defaultTimezone: "America/Bogota",
    } as any);
    soloTenantId = soloTenant.id;

    // Create User
    const user = await userRepo.create({
      email: `carlos.fin.${testSuffix}@example.com`,
      name: "Carlos Financial Pro",
      passwordHash: await PasswordHasher.hash("DevPass123!"),
    });
    testUserId = user.id;

    // Create Professional Profile & Workspace
    const [profProfile] = await db
      .insert(professionalProfiles)
      .values({
        userId: testUserId,
        professionalSlug: `carlos-fin-${testSuffix}`,
        displayName: "Carlos Financial Pro",
      })
      .returning();
    professionalProfileId = profProfile.id;

    await db.insert(professionalWorkspaces).values({
      professionalProfileId,
      tenantId: soloTenantId,
    });

    // Create Membership in Host
    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId: hostTenantId,
        userId: testUserId,
        status: "ACTIVE",
      })
      .returning();

    // Create Staff Profile in Host
    const [staff] = await db
      .insert(staffProfiles)
      .values({
        tenantId: hostTenantId,
        membershipId: membership.id,
        professionalProfileId,
        displayName: "Carlos Barber",
      })
      .returning();

    // Create Affiliation
    const [affiliation] = await db
      .insert(professionalAffiliations)
      .values({
        professionalWorkspaceTenantId: soloTenantId,
        professionalProfileId,
        hostTenantId,
        relationshipType: "COMMISSION",
        status: "ACTIVE",
      })
      .returning();
    affiliationId = affiliation.id;

    // Create Affiliation Terms: 2000 bp = 20% commission to Host
    await db.insert(professionalAffiliationTerms).values({
      affiliationId,
      settlementModel: "COMMISSION",
      commissionBasisPoints: 2000,
      currency: "COP",
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  // -------------------------------------------------------------
  // 1. Value Object & Pure Domain Invariants
  // -------------------------------------------------------------
  describe("1. Money & Domain Invariants", () => {
    it("should handle exact integer minor units and deterministic basis points with HALF_UP rounding", () => {
      const money = Money.fromMinor(100000, "COP"); // 100,000 COP

      // 20.00% commission (2000 basis points)
      const commission = money.multiplyBasisPoints(2000);
      expect(commission.amountMinor).toBe(BigInt(20000));
      expect(commission.currency).toBe("COP");

      // Remainder rounding test: 33.33% (3333 basis points)
      // 100,000 * 3333 / 10000 = 33330
      const fraction = money.multiplyBasisPoints(3333);
      expect(fraction.amountMinor).toBe(BigInt(33330));

      // 1 COP * 5000 bp (50%) -> numerator 5000 / 10000 = 0 rem 5000 -> HALF_UP rounds up to 1
      const small = Money.fromMinor(1, "COP").multiplyBasisPoints(5000);
      expect(small.amountMinor).toBe(BigInt(1));

      // 1 COP * 4999 bp (49.99%) -> remainder 4999 < 5000 -> rounds down to 0
      const smallFloor = Money.fromMinor(1, "COP").multiplyBasisPoints(4999);
      expect(smallFloor.amountMinor).toBe(BigInt(0));
    });

    it("should reject currency mismatch in Money operations", () => {
      const cop = Money.fromMinor(50000, "COP");
      const usd = Money.fromMinor(20, "USD");

      expect(() => cop.plus(usd)).toThrow(CurrencyMismatchError);
      expect(() => cop.minus(usd)).toThrow(CurrencyMismatchError);
    });

    it("should reject invalid journal lines with zero or negative amounts", () => {
      expect(
        () =>
          new JournalLine({
            financialAccountId: crypto.randomUUID(),
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.zero("COP"),
          })
      ).toThrow(InvalidJournalLineError);
    });

    it("should reject unbalanced journal entry and enforce mathematical double-entry equality", () => {
      const acc1 = crypto.randomUUID();
      const acc2 = crypto.randomUUID();

      // Debits: 100,000 != Credits: 80,000
      expect(
        () =>
          new JournalEntry({
            tenantId: hostTenantId,
            entryNumber: "TEST-UNBALANCED-01",
            entryType: "ADJUSTMENT",
            currency: "COP",
            sourceType: "ADJUSTMENT",
            description: "Unbalanced test",
            lines: [
              new JournalLine({
                financialAccountId: acc1,
                tenantId: hostTenantId,
                direction: "DEBIT",
                amount: Money.fromMinor(100000, "COP"),
              }),
              new JournalLine({
                financialAccountId: acc2,
                tenantId: hostTenantId,
                direction: "CREDIT",
                amount: Money.fromMinor(80000, "COP"),
              }),
            ],
          })
      ).toThrow(UnbalancedJournalEntryError);
    });

    it("should successfully construct balanced journal entry and support immutable reversal", () => {
      const acc1 = crypto.randomUUID();
      const acc2 = crypto.randomUUID();

      const balancedEntry = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: "TEST-BALANCED-01",
        entryType: "ADJUSTMENT",
        currency: "COP",
        sourceType: "ADJUSTMENT",
        description: "Balanced test",
        lines: [
          new JournalLine({
            financialAccountId: acc1,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(50000, "COP"),
          }),
          new JournalLine({
            financialAccountId: acc2,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: Money.fromMinor(50000, "COP"),
          }),
        ],
      });

      expect(balancedEntry.getTotalAmount().amountMinor).toBe(BigInt(50000));
      expect(balancedEntry.isReversed()).toBe(false);

      // Create reversal
      const reversal = balancedEntry.createReversal("REV-TEST-BALANCED-01", testUserId, "Testing reversal");
      expect(reversal.entryType).toBe("REVERSAL");
      expect(reversal.sourceType).toBe("REVERSAL");
      expect(reversal.lines.length).toBe(2);

      // Original line 1 was DEBIT 50k -> in reversal must be CREDIT 50k
      expect(reversal.lines[0].direction).toBe("CREDIT");
      expect(reversal.lines[1].direction).toBe("DEBIT");
      expect(reversal.getTotalAmount().amountMinor).toBe(BigInt(50000));

      // Cannot reverse an already reversed entry
      expect(() =>
        balancedEntry.createReversal("REV-AGAIN", testUserId, "Again")
      ).not.toThrow(); // because balancedEntry was factory, but if status marked REVERSED:
      const reversedInstance = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: "TEST-REV-CHECK",
        entryType: "ADJUSTMENT",
        currency: "COP",
        sourceType: "ADJUSTMENT",
        description: "Already reversed check",
        status: "REVERSED",
        lines: balancedEntry.lines as any,
      });
      expect(() =>
        reversedInstance.createReversal("FAIL", testUserId, "Fail")
      ).toThrow(JournalEntryAlreadyReversedError);
    });
  });

  // -------------------------------------------------------------
  // 2. Chart of Accounts & Normal Balances
  // -------------------------------------------------------------
  describe("2. Chart of Accounts & Repository Bootstrap", () => {
    it("should initialize 18 standard financial accounts for a tenant idempotently", async () => {
      const accounts1 = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      expect(accounts1.size).toBeGreaterThanOrEqual(18);

      const cashAcc = accounts1.get(STANDARD_ACCOUNT_CODES.CASH);
      expect(cashAcc).toBeDefined();
      expect(cashAcc?.accountType).toBe("ASSET");
      expect(cashAcc?.normalBalance).toBe("DEBIT");

      const serviceRevAcc = accounts1.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE);
      expect(serviceRevAcc?.accountType).toBe("REVENUE");
      expect(serviceRevAcc?.normalBalance).toBe("CREDIT");

      const operatingExpAcc = accounts1.get(STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE);
      expect(operatingExpAcc?.accountType).toBe("EXPENSE");
      expect(operatingExpAcc?.normalBalance).toBe("DEBIT");

      // Idempotency: calling again must return exact same accounts without duplicates
      const accounts2 = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      expect(accounts2.size).toBe(accounts1.size);
    });
  });

  // -------------------------------------------------------------
  // 3. Appointment Financialization & Collection Party Semantics
  // -------------------------------------------------------------
  describe("3. Service Revenue & Collector Party Semantics", () => {
    it("should financialize appointment COLLECTED_BY_HOST with dual-workspace balanced ledger entries", async () => {
      // 1. Create a service in Host catalog
      const [service] = await db
        .insert(services)
        .values({
          tenantId: hostTenantId,
          name: "Signature Haircut",
          slug: `signature-haircut-${testSuffix}`,
          priceMinor: 100000, // 100,000 COP
          currency: "COP",
          durationMinutes: 45,
        })
        .returning();

      // 2. Look up Carlos staff profile
      const [staff] = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.professionalProfileId, professionalProfileId))
        .limit(1);

      // 3. Create appointment
      const now = new Date();
      const ends = new Date(now.getTime() + 45 * 60000);
      const [appointment] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: hostLocationId,
          staffId: staff.id,
          customerNameSnapshot: "Juan Perez",
          status: "COMPLETED",
          startsAt: now,
          endsAt: ends,
          source: "DIRECT_STAFF",
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: appointment.id,
        serviceId: service.id,
        serviceNameSnapshot: "Signature Haircut",
        durationMinutes: 45,
        priceMinor: 100000,
        currency: "COP",
        position: 1,
      });

      // 4. Execute PostServiceRevenueUseCase
      const useCase = new PostServiceRevenueUseCase(financeRepo);
      const result = await useCase.execute({
        appointmentId: appointment.id,
        actorUserId: testUserId,
        collectorParty: "COLLECTED_BY_HOST",
        tipMinor: 10000, // 10,000 COP tip
      });

      // Assertions
      expect(result.grossServiceAmount.amountMinor).toBe(BigInt(100000));
      expect(result.tipAmount.amountMinor).toBe(BigInt(10000));
      // Host commission: 20% of 100,000 = 20,000 COP
      expect(result.hostCommissionAmount.amountMinor).toBe(BigInt(20000));
      // Professional total share: 80,000 service share + 10,000 tip = 90,000 COP
      expect(result.professionalShare.amountMinor).toBe(BigInt(90000));

      // Verify Host Journal Entry
      expect(result.hostJournalEntry).toBeDefined();
      const hostLines = result.hostJournalEntry!.lines;
      const hostTotalDebits = hostLines
        .filter((l) => l.isDebit())
        .reduce((sum, l) => sum + l.amount.amountMinor, BigInt(0));
      const hostTotalCredits = hostLines
        .filter((l) => l.isCredit())
        .reduce((sum, l) => sum + l.amount.amountMinor, BigInt(0));
      expect(hostTotalDebits).toBe(BigInt(110000)); // 100k + 10k tip
      expect(hostTotalCredits).toBe(BigInt(110000)); // 20k comm + 80k pro payable + 10k tip payable

      // Verify Professional Solo Workspace Journal Entry
      expect(result.professionalJournalEntry).toBeDefined();
      const profLines = result.professionalJournalEntry!.lines;
      const profTotalDebits = profLines
        .filter((l) => l.isDebit())
        .reduce((sum, l) => sum + l.amount.amountMinor, BigInt(0));
      const profTotalCredits = profLines
        .filter((l) => l.isCredit())
        .reduce((sum, l) => sum + l.amount.amountMinor, BigInt(0));
      expect(profTotalDebits).toBe(BigInt(110000)); // 90k receivable from host + 20k commission expense
      expect(profTotalCredits).toBe(BigInt(110000)); // 100k service revenue + 10k tip revenue

      // Idempotency: Calling a second time must return existing entries without throwing or duplicating
      const secondCall = await useCase.execute({
        appointmentId: appointment.id,
        actorUserId: testUserId,
        collectorParty: "COLLECTED_BY_HOST",
      });
      expect(secondCall.hostJournalEntry?.id).toBe(result.hostJournalEntry?.id);
    });

    it("should financialize appointment COLLECTED_BY_PROFESSIONAL correctly", async () => {
      // Create appointment where Carlos collected money in cash directly
      const [staff] = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.professionalProfileId, professionalProfileId))
        .limit(1);

      const [appointment] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: hostLocationId,
          staffId: staff.id,
          customerNameSnapshot: "Andres Gomez",
          status: "COMPLETED",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 60000),
          source: "DIRECT_STAFF",
        })
        .returning();

      const [service2] = await db
        .insert(services)
        .values({
          tenantId: hostTenantId,
          name: "Beard Trim",
          slug: `beard-trim-${testSuffix}`,
          priceMinor: 50000,
          currency: "COP",
          durationMinutes: 30,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: appointment.id,
        serviceId: service2.id,
        serviceNameSnapshot: "Beard Trim",
        durationMinutes: 30,
        priceMinor: 50000, // 50,000 COP
        currency: "COP",
        position: 1,
      });

      const useCase = new PostServiceRevenueUseCase(financeRepo);
      const result = await useCase.execute({
        appointmentId: appointment.id,
        actorUserId: testUserId,
        collectorParty: "COLLECTED_BY_PROFESSIONAL",
        tipMinor: 5000,
      });

      // Professional collected 55,000 COP cash.
      // Host commission: 20% of 50,000 = 10,000 COP.
      // Carlos owes Host 10,000 COP.
      expect(result.hostCommissionAmount.amountMinor).toBe(BigInt(10000));

      // Host recorded receivable of 10,000 COP from Carlos
      expect(result.hostJournalEntry).toBeDefined();
      const hostLines = result.hostJournalEntry!.lines;
      expect(hostLines.find((l) => l.isDebit())?.amount.amountMinor).toBe(BigInt(10000));
      expect(hostLines.find((l) => l.isCredit())?.amount.amountMinor).toBe(BigInt(10000));

      // Carlos recorded cash 55,000 and Host Commission Payable of 10,000 COP
      expect(result.professionalJournalEntry).toBeDefined();
      const profLines = result.professionalJournalEntry!.lines;
      const debits = profLines.filter((l) => l.isDebit()).reduce((s, l) => s + l.amount.amountMinor, BigInt(0));
      const credits = profLines.filter((l) => l.isCredit()).reduce((s, l) => s + l.amount.amountMinor, BigInt(0));
      expect(debits).toBe(credits);
    });

    it("should handle CHAIR_RENTAL model where professional receives 100% of service revenue", () => {
      const breakdown = SettlementPolicy.calculateServiceBreakdown({
        serviceGrossMinor: BigInt(80000),
        tipMinor: BigInt(5000),
        currency: "COP",
        settlementModel: "CHAIR_RENTAL",
        commissionBasisPoints: 0,
        collectorParty: "COLLECTED_BY_PROFESSIONAL",
      });

      expect(breakdown.hostCommissionAmount.amountMinor).toBe(BigInt(0));
      expect(breakdown.professionalServiceShare.amountMinor).toBe(BigInt(80000));
      expect(breakdown.professionalTotalShare.amountMinor).toBe(BigInt(85000));
      expect(breakdown.hostNetReceivable.amountMinor).toBe(BigInt(0));
    });
  });

  // -------------------------------------------------------------
  // 4. Operating Expenses & Reversals
  // -------------------------------------------------------------
  describe("4. Operational Expenses & Reversals", () => {
    let createdExpenseId: string;

    it("should record an operational expense and post balanced double-entry journal lines", async () => {
      const recordUseCase = new RecordExpenseUseCase(financeRepo);
      const expense = await recordUseCase.execute({
        tenantId: soloTenantId,
        description: "Shaving cream and razor blades",
        amountMinor: 35000, // 35,000 COP
        vendorName: "Barber Supplies Co",
        actorUserId: testUserId,
      });

      expect(expense.id).toBeDefined();
      expect(expense.amount.amountMinor).toBe(BigInt(35000));
      expect(expense.status).toBe("POSTED");
      expect(expense.journalEntryId).toBeDefined();
      createdExpenseId = expense.id!;

      // Verify linked journal entry
      const je = await financeRepo.findJournalEntryById(expense.journalEntryId!);
      expect(je).toBeDefined();
      expect(je?.entryType).toBe("EXPENSE");
      expect(je?.lines.length).toBe(2);
      expect(je?.getTotalAmount().amountMinor).toBe(BigInt(35000));

      // Operating Expense account was DEBITED, Cash account was CREDITED
      const debitLine = je?.lines.find((l) => l.isDebit());
      const creditLine = je?.lines.find((l) => l.isCredit());
      expect(debitLine?.amount.amountMinor).toBe(BigInt(35000));
      expect(creditLine?.amount.amountMinor).toBe(BigInt(35000));
    });

    it("should reverse operational expense and post counter-balancing journal entry", async () => {
      const reverseUseCase = new ReverseExpenseUseCase(financeRepo);
      const reversed = await reverseUseCase.execute({
        expenseId: createdExpenseId,
        tenantId: soloTenantId,
        actorUserId: testUserId,
        reason: "Entered by mistake",
      });

      expect(reversed.status).toBe("REVERSED");

      // Verify original journal entry is now REVERSED
      const originalJe = await financeRepo.findJournalEntryById(reversed.journalEntryId!);
      expect(originalJe?.status).toBe("REVERSED");
      expect(originalJe?.reversedEntryId).toBeDefined();

      // Verify reversal entry
      const reversalJe = await financeRepo.findJournalEntryById(originalJe!.reversedEntryId!);
      expect(reversalJe?.entryType).toBe("REVERSAL");
      expect(reversalJe?.getTotalAmount().amountMinor).toBe(BigInt(35000));
    });
  });

  // -------------------------------------------------------------
  // 5. Settlements & Liquidations
  // -------------------------------------------------------------
  describe("5. Settlements & Liquidation Transfers", () => {
    it("should reject settlement where fromTenantId equals toTenantId", async () => {
      const settleUseCase = new CreateSettlementUseCase(financeRepo);
      await expect(
        settleUseCase.execute({
          fromTenantId: hostTenantId,
          toTenantId: hostTenantId,
          amountMinor: 50000,
          actorUserId: testUserId,
        })
      ).rejects.toThrow(CrossTenantSettlementError);
    });

    it("should record liquidation payout from Host to Professional with balanced double-entry entries", async () => {
      const settleUseCase = new CreateSettlementUseCase(financeRepo);
      const settlement = await settleUseCase.execute({
        fromTenantId: hostTenantId,
        toTenantId: soloTenantId,
        affiliationId,
        amountMinor: 80000, // 80,000 COP payout
        settlementType: "COMMISSION",
        notes: "Bi-weekly commission liquidation",
        actorUserId: testUserId,
      });

      expect(settlement.id).toBeDefined();
      expect(settlement.amount.amountMinor).toBe(BigInt(80000));
      expect(settlement.status).toBe("CONFIRMED");
      expect(settlement.journalEntryId).toBeDefined();

      // Verify Payer Journal Entry (Host: DEBIT Payable/Clearing, CREDIT Cash)
      const payerJe = await financeRepo.findJournalEntryById(settlement.journalEntryId!);
      expect(payerJe).toBeDefined();
      expect(payerJe?.tenantId).toBe(hostTenantId);
      expect(payerJe?.entryType).toBe("SETTLEMENT");
      expect(payerJe?.getTotalAmount().amountMinor).toBe(BigInt(80000));
    });
  });

  // -------------------------------------------------------------
  // 6. Derived Financial Balances (Source of Truth Test)
  // -------------------------------------------------------------
  describe("6. Derived Financial Balances & Summary", () => {
    it("should calculate mathematical balance sheet without mutable balance columns", async () => {
      const summaryUseCase = new GetFinancialSummaryUseCase(financeRepo);
      const hostSummary = await summaryUseCase.execute({
        tenantId: hostTenantId,
      });

      expect(hostSummary.tenantId).toBe(hostTenantId);
      expect(hostSummary.currency).toBe("COP");
      expect(hostSummary.accountBalances.length).toBeGreaterThanOrEqual(18);

      // Invariant: Net Income must mathematically equal Revenue minus Expenses
      const computedNetIncome = hostSummary.totalRevenue.minus(hostSummary.totalExpenses);
      expect(hostSummary.netIncome.amountMinor).toBe(computedNetIncome.amountMinor);

      // Verify that every account balance is derived from debit and credit sums
      for (const ab of hostSummary.accountBalances) {
        if (ab.account.normalBalance === "DEBIT") {
          expect(ab.netBalance.amountMinor).toBe(
            ab.debitTotal.amountMinor - ab.creditTotal.amountMinor
          );
        } else {
          expect(ab.netBalance.amountMinor).toBe(
            ab.creditTotal.amountMinor - ab.debitTotal.amountMinor
          );
        }
      }
    });

    it("should derive settlement balances between host and independent professional", async () => {
      const balance = await financeRepo.getSettlementBalance(hostTenantId, soloTenantId, "COP");
      expect(balance.hostTenantId).toBe(hostTenantId);
      expect(balance.professionalTenantId).toBe(soloTenantId);
      expect(balance.netOwedToProfessional).toBeDefined();
    });
  });
});
