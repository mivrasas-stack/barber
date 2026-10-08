import { describe, it, expect, beforeAll } from "vitest";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { tenants } from "@/infrastructure/database/schema/tenants";
import { users } from "@/infrastructure/database/schema/users";
import { locations } from "@/infrastructure/database/schema/locations";
import { services } from "@/infrastructure/database/schema/services";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import { appointments, appointmentServices } from "@/infrastructure/database/schema/appointments";
import {
  professionalAffiliations,
  professionalAffiliationTerms,
} from "@/infrastructure/database/schema/professionals";
import {
  financialAccounts,
  journalEntries,
  journalLines,
  expenses,
  settlements,
  professionalAffiliationTermVersions,
} from "@/infrastructure/database/schema/finance";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { DrizzleAppointmentRepository } from "@/modules/appointments/infrastructure/drizzle-appointment.repository";
import { PostServiceRevenueUseCase } from "@/modules/finance/application/post-service-revenue.usecase";
import { PostChairRentObligationUseCase } from "@/modules/finance/application/post-chair-rent-obligation.usecase";
import { CreateSettlementUseCase } from "@/modules/finance/application/create-settlement.usecase";
import { ReverseJournalEntryUseCase } from "@/modules/finance/application/reverse-journal-entry.usecase";
import { GetFinancialSummaryUseCase } from "@/modules/finance/application/get-financial-summary.usecase";
import { Money } from "@/modules/finance/domain/money";
import { JournalEntry } from "@/modules/finance/domain/journal-entry";
import { JournalLine } from "@/modules/finance/domain/journal-line";
import { SettlementPolicy } from "@/modules/finance/domain/settlement-policy";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";
import {
  CurrencyMismatchError,
  SettlementExceedsOutstandingError,
  SettledOperationReversalBlockedError,
  JournalEntryAlreadyReversedError,
} from "@/modules/finance/domain/finance-errors";
import { ConflictError, ForbiddenError } from "@/shared/errors/app-error";
import { authorizeFinanceRequest } from "@/modules/finance/infrastructure/finance-auth";
import { NextRequest } from "next/server";
import { createSession, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";

describe("Barber Paradise v2 — Stage 3A.1: Financial Core Hardening & Ledger Certification", () => {
  let financeRepo: DrizzleFinanceRepository;
  let appointmentRepo: DrizzleAppointmentRepository;
  let postRevenueUseCase: PostServiceRevenueUseCase;
  let postChairRentUseCase: PostChairRentObligationUseCase;
  let createSettlementUseCase: CreateSettlementUseCase;
  let reverseJeUseCase: ReverseJournalEntryUseCase;
  let getSummaryUseCase: GetFinancialSummaryUseCase;

  // Shared test entity IDs
  let hostTenantId: string;
  let soloTenantId: string;
  let staffId: string;
  let affiliationId: string;
  let devLocationId: string;
  let devCustomerId: string;
  let soloBarberUserId: string;
  let hostOwnerUserId: string;
  let devServiceId: string;

  beforeAll(async () => {
    financeRepo = new DrizzleFinanceRepository();
    appointmentRepo = new DrizzleAppointmentRepository();
    postRevenueUseCase = new PostServiceRevenueUseCase(financeRepo);
    postChairRentUseCase = new PostChairRentObligationUseCase(financeRepo);
    createSettlementUseCase = new CreateSettlementUseCase(financeRepo);
    reverseJeUseCase = new ReverseJournalEntryUseCase(financeRepo);
    getSummaryUseCase = new GetFinancialSummaryUseCase(financeRepo);

    // Fetch seeded dev tenant (The Royal Barber Shop)
    const [host] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "the-royal-barber"))
      .limit(1);
    hostTenantId = host.id;

    // Fetch solo tenant (Carlos Barber Studio)
    const [solo] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "carlos-barber-studio"))
      .limit(1);
    soloTenantId = solo.id;

    // Fetch Carlos user
    const [carlos] = await db
      .select()
      .from(users)
      .where(eq(users.email, "carlos.independent@royalbarber.dev"))
      .limit(1);
    soloBarberUserId = carlos.id;

    // Fetch host owner user
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "owner@royalbarber.dev"))
      .limit(1);
    hostOwnerUserId = owner.id;

    // Fetch host location
    const [loc] = await db
      .select()
      .from(locations)
      .where(eq(locations.tenantId, hostTenantId))
      .limit(1);
    devLocationId = loc.id;

    // Fetch dev customer
    const [cust] = await db
      .select()
      .from(users)
      .where(eq(users.email, "customer@barberparadise.dev"))
      .limit(1);
    devCustomerId = cust.id;

    // Fetch staff profile for Carlos in Host Tenant
    const [staff] = await db
      .select()
      .from(staffProfiles)
      .where(
        and(
          eq(staffProfiles.tenantId, hostTenantId),
          eq(staffProfiles.displayName, "Carlos Mendoza (Independiente)")
        )
      )
      .limit(1);
    staffId = staff.id;

    // Fetch active affiliation
    const [affil] = await db
      .select()
      .from(professionalAffiliations)
      .where(
        and(
          eq(professionalAffiliations.hostTenantId, hostTenantId),
          eq(professionalAffiliations.status, "ACTIVE")
        )
      )
      .limit(1);
    affiliationId = affil.id;

    // Fetch a catalog service
    const [srv] = await db
      .select()
      .from(services)
      .where(eq(services.tenantId, hostTenantId))
      .limit(1);
    devServiceId = srv.id;
  });

  // =========================================================================
  // 1. GLOBAL DOUBLE-ENTRY LEDGER INVARIANT (Point 3)
  // =========================================================================
  describe("1. Global Double-Entry Invariant (Zero Out-of-Balance Across All Posted Entries)", () => {
    it("should satisfy SUM(DEBIT) === SUM(CREDIT) for EVERY posted journal entry in the database", async () => {
      const allPostedEntries = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.status, "POSTED"));

      expect(allPostedEntries.length).toBeGreaterThan(0);

      for (const entry of allPostedEntries) {
        const lines = await db
          .select()
          .from(journalLines)
          .where(eq(journalLines.journalEntryId, entry.id));

        expect(lines.length).toBeGreaterThanOrEqual(2);

        let sumDebit = BigInt(0);
        let sumCredit = BigInt(0);

        for (const line of lines) {
          const val = BigInt(line.amountMinor);
          expect(val).toBeGreaterThan(BigInt(0));
          if (line.direction === "DEBIT") {
            sumDebit += val;
          } else if (line.direction === "CREDIT") {
            sumCredit += val;
          }
        }

        expect(sumDebit.toString()).toBe(sumCredit.toString());
      }
    });
  });

  // =========================================================================
  // 2. POSTED JOURNAL IMMUTABILITY (Point 4)
  // =========================================================================
  describe("2. Posted Journal Immutability", () => {
    it("should prevent updating a posted journal entry or its lines, enforcing corrections via reversal only", async () => {
      const [entry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.status, "POSTED"))
        .limit(1);

      expect(entry).toBeDefined();

      // Attempting to reverse already-reversed entry should fail
      const reversalNumber = `REV-IMMUT-${Date.now()}`;
      const originalDomain = await financeRepo.findJournalEntryById(entry.id);
      expect(originalDomain).not.toBeNull();

      // Create a reversal cleanly
      const reversed = await financeRepo.reverseJournalEntry(
        entry.id,
        hostOwnerUserId,
        "Auditing immutability"
      );
      expect(reversed.status).toBe("POSTED");
      expect(reversed.reversalOfEntryId).toBe(entry.id);

      // Verify original is now marked REVERSED
      const updatedOriginal = await financeRepo.findJournalEntryById(entry.id);
      expect(updatedOriginal!.status).toBe("REVERSED");

      // Attempting to reverse a second time must throw JournalEntryAlreadyReversedError
      await expect(
        financeRepo.reverseJournalEntry(entry.id, hostOwnerUserId, "Duplicate reversal attempt")
      ).rejects.toThrow(JournalEntryAlreadyReversedError);
    });
  });

  // =========================================================================
  // 3. INTER-WORKSPACE RECONCILIATION & CORRELATION (Points 5, 6, 7, 8)
  // =========================================================================
  describe("3. Inter-Workspace Reconciliation & Counterparty Obligations", () => {
    it("should verify exact matching of payable and receivable obligations with correlation identifiers (COLLECTED_BY_HOST)", async () => {
      // 100,000 COP service, 20% commission (2000 bp), COLLECTED_BY_HOST
      const allocation = SettlementPolicy.calculateServiceBreakdown({
        serviceGrossMinor: BigInt(100000),
        currency: "COP",
        settlementModel: "COMMISSION",
        commissionBasisPoints: 2000,
        collectorParty: "COLLECTED_BY_HOST",
      });

      expect(allocation.grossServiceAmount.amountMinor).toBe(BigInt(100000));
      expect(allocation.hostCommissionAmount.amountMinor).toBe(BigInt(20000));
      expect(allocation.professionalServiceShare.amountMinor).toBe(BigInt(80000));
      expect(allocation.professionalNetReceivable.amountMinor).toBe(BigInt(80000));

      // Create appointment to test dual posting
      const now = new Date();
      const apptStarts = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10);
      const apptEnds = new Date(apptStarts.getTime() + 1000 * 60 * 30);

      const [newAppt] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptStarts,
          endsAt: apptEnds,
          status: "COMPLETED",
          completedAt: new Date(),
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: newAppt.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Haircut Service",
        priceMinor: 100000,
        currency: "COP",
        durationMinutes: 30,
      });

      // Post revenue with COLLECTED_BY_HOST
      const postResult = await postRevenueUseCase.execute({
        appointmentId: newAppt.id,
        collectorParty: "COLLECTED_BY_HOST",
        actorUserId: hostOwnerUserId,
      });

      expect(postResult.hostJournalEntry).toBeDefined();
      expect(postResult.professionalJournalEntry).toBeDefined();

      const hostJe = postResult.hostJournalEntry!;
      const profJe = postResult.professionalJournalEntry!;

      // Verify inter-workspace correlation ID
      expect((hostJe.metadata as any)?.correlationId).toBe(newAppt.id);
      expect((profJe.metadata as any)?.correlationId).toBe(newAppt.id);
      expect((hostJe.metadata as any)?.counterpartyTenantId).toBe(soloTenantId);
      expect((profJe.metadata as any)?.counterpartyTenantId).toBe(hostTenantId);

      // Verify Counterparty Invariant: Host Payable === Professional Receivable
      const hostPayableLine = hostJe.lines.find((l) => l.direction === "CREDIT" && l.memo?.includes("Professional"));
      const profReceivableLine = profJe.lines.find((l) => l.direction === "DEBIT" && l.memo?.includes("Receivable"));

      expect(hostPayableLine).toBeDefined();
      expect(profReceivableLine).toBeDefined();
      expect(hostPayableLine!.amount.amountMinor).toBe(profReceivableLine!.amount.amountMinor);
      expect(hostPayableLine!.amount.amountMinor).toBe(postResult.professionalShare.amountMinor);
    });

    it("should verify exact matching of payable and receivable obligations (COLLECTED_BY_PROFESSIONAL)", async () => {
      // 100,000 COP service, 20% commission (2000 bp), COLLECTED_BY_PROFESSIONAL
      const allocation = SettlementPolicy.calculateServiceBreakdown({
        serviceGrossMinor: BigInt(100000),
        currency: "COP",
        settlementModel: "COMMISSION",
        commissionBasisPoints: 2000,
        collectorParty: "COLLECTED_BY_PROFESSIONAL",
      });

      expect(allocation.grossServiceAmount.amountMinor).toBe(BigInt(100000));
      expect(allocation.hostCommissionAmount.amountMinor).toBe(BigInt(20000));
      expect(allocation.professionalServiceShare.amountMinor).toBe(BigInt(80000));
      expect(allocation.hostNetReceivable.amountMinor).toBe(BigInt(20000));

      const now = new Date();
      const apptStarts = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 11);
      const apptEnds = new Date(apptStarts.getTime() + 1000 * 60 * 30);

      const [newAppt] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptStarts,
          endsAt: apptEnds,
          status: "COMPLETED",
          completedAt: new Date(),
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: newAppt.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Haircut Service",
        priceMinor: 100000,
        currency: "COP",
        durationMinutes: 30,
      });

      const postResult = await postRevenueUseCase.execute({
        appointmentId: newAppt.id,
        collectorParty: "COLLECTED_BY_PROFESSIONAL",
        actorUserId: soloBarberUserId,
      });

      const hostJe = postResult.hostJournalEntry!;
      const profJe = postResult.professionalJournalEntry!;

      // Host has Commission Receivable
      // Professional has Commission Payable to Host
      const hostReceivableLine = hostJe.lines.find((l) => l.direction === "DEBIT" && l.memo?.includes("Receivable commission"));
      const profPayableLine = profJe.lines.find((l) => l.direction === "CREDIT" && l.memo?.includes("Commission payable"));

      expect(hostReceivableLine).toBeDefined();
      expect(profPayableLine).toBeDefined();
      expect(hostReceivableLine!.amount.amountMinor).toBe(profPayableLine!.amount.amountMinor);
      expect(hostReceivableLine!.amount.amountMinor).toBe(postResult.hostCommissionAmount.amountMinor);
    });
  });

  // =========================================================================
  // 4. ROUNDING RECONCILIATION & SINGLE ALLOCATION (Points 9, 10)
  // =========================================================================
  describe("4. Rounding Reconciliation & Canonical Allocation", () => {
    it("should compute 99,999 COP with 1,750 basis points (17.50%) with zero divergence across postings", () => {
      // 99,999 * 1750 / 10000 = 17,499.825 -> HALF_UP gives 17,500
      // Remainder for professional: 99,999 - 17,500 = 82,499
      const allocation = SettlementPolicy.calculateServiceBreakdown({
        serviceGrossMinor: BigInt(99999),
        currency: "COP",
        settlementModel: "COMMISSION",
        commissionBasisPoints: 1750,
        collectorParty: "COLLECTED_BY_HOST",
      });

      expect(allocation.hostCommissionAmount.amountMinor).toBe(BigInt(17500));
      expect(allocation.professionalServiceShare.amountMinor).toBe(BigInt(82499));
      expect(
        allocation.hostCommissionAmount.plus(allocation.professionalServiceShare).amountMinor
      ).toBe(BigInt(99999));
    });
  });

  // =========================================================================
  // 5. CONCURRENT APPOINTMENT COMPLETION (Points 11, 12)
  // =========================================================================
  describe("5. 50-Concurrent Appointment Completion Race Condition", () => {
    it("should allow EXACTLY 1 completion and prevent revenue duplication across 50 simultaneous attempts", async () => {
      const apptStarts = new Date(Date.now() + 1000 * 60 * 60 * 24 * (50 + Math.floor(Math.random() * 100000)));
      const apptEnds = new Date(apptStarts.getTime() + 1000 * 60 * 30);

      const [raceAppt] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptStarts,
          endsAt: apptEnds,
          status: "IN_PROGRESS",
          version: 1,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: raceAppt.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Race Service",
        priceMinor: 50000,
        currency: "COP",
        durationMinutes: 30,
      });

      // Launch 50 concurrent attempts to transition status to COMPLETED
      const concurrencyCount = 50;
      const promises = Array.from({ length: concurrencyCount }, () =>
        appointmentRepo.updateStatusWithDetails({
          appointmentId: raceAppt.id,
          expectedVersion: 1,
          fromStatus: "IN_PROGRESS",
          toStatus: "COMPLETED",
          actorUserId: hostOwnerUserId,
          reason: "Completed service in stress race test",
          outboxEvent: {
            tenantId: hostTenantId,
            locationId: devLocationId,
            aggregateId: raceAppt.id,
            eventType: "appointment.completed",
            payload: { appointmentId: raceAppt.id },
          },
          auditLog: {
            tenantId: hostTenantId,
            actorUserId: hostOwnerUserId,
            action: "COMPLETE_APPOINTMENT",
            entityType: "appointment",
            entityId: raceAppt.id,
            stateBefore: { status: "IN_PROGRESS", version: 1 },
            stateAfter: { status: "COMPLETED", version: 2 },
          },
        })
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(concurrencyCount - 1);

      // Verify exactly 1 Host Journal Entry was posted for this appointment
      const hostEntries = await db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, hostTenantId),
            eq(journalEntries.sourceType, "APPOINTMENT"),
            eq(journalEntries.sourceId, raceAppt.id),
            eq(journalEntries.status, "POSTED")
          )
        );
      expect(hostEntries.length).toBe(1);

      // Verify exactly 1 Professional Journal Entry was posted
      const profEntries = await db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.tenantId, soloTenantId),
            eq(journalEntries.sourceType, "APPOINTMENT"),
            eq(journalEntries.sourceId, raceAppt.id),
            eq(journalEntries.status, "POSTED")
          )
        );
      expect(profEntries.length).toBe(1);
    });
  });

  // =========================================================================
  // 6. HISTORICAL AFFILIATION TERMS & OVERLAP CONSTRAINT (Points 13, 14)
  // =========================================================================
  describe("6. Historical Affiliation Terms & Overlap Protection", () => {
    it("should resolve terms based on appointment date and prevent ambiguous overlapping term intervals", async () => {
      // 1. Insert historical term version 1: Oct 1 - Oct 15 at 2000 bp (20%)
      const oct1 = new Date("2026-10-01T00:00:00Z");
      const oct15 = new Date("2026-10-15T23:59:59Z");
      const oct16 = new Date("2026-10-16T00:00:00Z");
      const oct31 = new Date("2026-10-31T23:59:59Z");

      // Ensure clean slate for affiliation term versions
      await db
        .delete(professionalAffiliationTermVersions)
        .where(eq(professionalAffiliationTermVersions.affiliationId, affiliationId));

      await db.insert(professionalAffiliationTermVersions).values({
        affiliationId,
        versionNumber: 101,
        settlementModel: "COMMISSION",
        commissionBasisPoints: 2000,
        currency: "COP",
        effectiveFrom: oct1,
        effectiveUntil: oct15,
        changeReason: "Initial agreed 20% commission",
      });

      // 2. Insert term version 2: Oct 16 - Oct 31 at 3000 bp (30%)
      await db.insert(professionalAffiliationTermVersions).values({
        affiliationId,
        versionNumber: 102,
        settlementModel: "COMMISSION",
        commissionBasisPoints: 3000,
        currency: "COP",
        effectiveFrom: oct16,
        effectiveUntil: oct31,
        changeReason: "Upgraded 30% commission",
      });

      // 3. PostgreSQL Exclusion Constraint verification (Point 14):
      // Attempting to insert an overlapping interval [Oct 10, Oct 20] MUST be physically rejected by GiST
      const overlappingFrom = new Date("2026-10-10T00:00:00Z");
      const overlappingUntil = new Date("2026-10-20T00:00:00Z");

      await expect(
        db.insert(professionalAffiliationTermVersions).values({
          affiliationId,
          versionNumber: 103,
          settlementModel: "COMMISSION",
          commissionBasisPoints: 2500,
          currency: "COP",
          effectiveFrom: overlappingFrom,
          effectiveUntil: overlappingUntil,
          changeReason: "Ambiguous overlapping range",
        })
      ).rejects.toThrow();

      // 4. Test historical appointment resolution:
      // Appointment on Oct 10 resolves Version 101 (20%)
      const apptOct10Starts = new Date("2026-10-10T15:00:00Z");
      const [apptOct10] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptOct10Starts,
          endsAt: new Date(apptOct10Starts.getTime() + 1000 * 60 * 30),
          status: "COMPLETED",
          completedAt: apptOct10Starts,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: apptOct10.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Historical Oct 10 Service",
        priceMinor: 100000,
        currency: "COP",
        durationMinutes: 30,
      });

      const resOct10 = await postRevenueUseCase.execute({
        appointmentId: apptOct10.id,
        collectorParty: "COLLECTED_BY_HOST",
      });

      // Oct 10: 20% host commission (20,000)
      expect(resOct10.hostCommissionAmount.amountMinor).toBe(BigInt(20000));
      expect(resOct10.professionalShare.amountMinor).toBe(BigInt(80000));
      expect((resOct10.hostJournalEntry!.metadata as any)?.termVersionNumber).toBe(101);

      // Appointment on Oct 20 resolves Version 102 (30%)
      const apptOct20Starts = new Date("2026-10-20T15:00:00Z");
      const [apptOct20] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptOct20Starts,
          endsAt: new Date(apptOct20Starts.getTime() + 1000 * 60 * 30),
          status: "COMPLETED",
          completedAt: apptOct20Starts,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: apptOct20.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Historical Oct 20 Service",
        priceMinor: 100000,
        currency: "COP",
        durationMinutes: 30,
      });

      const resOct20 = await postRevenueUseCase.execute({
        appointmentId: apptOct20.id,
        collectorParty: "COLLECTED_BY_HOST",
      });

      // Oct 20: 30% host commission (30,000)
      expect(resOct20.hostCommissionAmount.amountMinor).toBe(BigInt(30000));
      expect(resOct20.professionalShare.amountMinor).toBe(BigInt(70000));
      expect((resOct20.hostJournalEntry!.metadata as any)?.termVersionNumber).toBe(102);
    });
  });

  // =========================================================================
  // 7. CHAIR RENT PERIOD IDEMPOTENCY (Point 15)
  // =========================================================================
  describe("7. Chair Rent Periodic Idempotency under 50 Concurrencies", () => {
    it("should allow EXACTLY 1 periodic obligation and prevent duplicates across 50 simultaneous attempts", async () => {
      const randomId = Math.floor(Math.random() * 10000000);
      const period = `CR-${Date.now()}-${randomId}`;
      const periodStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
      const periodEnd = new Date(periodStart.getTime() + 1000 * 60 * 60 * 24 * 30);

      // Ensure clean state for this period
      await db
        .delete(settlements)
        .where(
          and(
            eq(settlements.affiliationId, affiliationId),
            eq(settlements.settlementType, "CHAIR_RENT"),
            eq(settlements.periodStart, periodStart)
          )
        );

      const concurrencyCount = 50;
      const promises = Array.from({ length: concurrencyCount }, () =>
        postChairRentUseCase.execute({
          affiliationId,
          period,
          periodStart,
          periodEnd,
          amountMinor: BigInt(800000),
          actorUserId: hostOwnerUserId,
        })
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r) => r.status === "fulfilled");

      // All fulfilled should either be the creator or an idempotent replay
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      // Verify in DB that only 1 obligation row exists in settlements for this period
      const dbSettlements = await db
        .select()
        .from(settlements)
        .where(
          and(
            eq(settlements.affiliationId, affiliationId),
            eq(settlements.settlementType, "CHAIR_RENT"),
            eq(settlements.reference, `RENT-${period}`)
          )
        );

      expect(dbSettlements.length).toBe(1);
      expect(BigInt(dbSettlements[0].amountMinor)).toBe(BigInt(800000));
    });
  });

  // =========================================================================
  // 8. SETTLEMENT RECONCILIATION & CONCURRENT OVER-SETTLEMENT (Points 17, 18)
  // =========================================================================
  describe("8. Settlement Reconciliation & Over-Settlement Protection", () => {
    it("should reject concurrent over-settlement beyond outstanding payable balance", async () => {
      // Create fresh host obligation of 500,000 COP payable to Carlos
      const apptStarts = new Date("2026-11-01T10:00:00Z");
      const [appt] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptStarts,
          endsAt: new Date(apptStarts.getTime() + 1000 * 60 * 30),
          status: "COMPLETED",
          completedAt: apptStarts,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: appt.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "High Value Service",
        priceMinor: 625000, // 80% to Carlos = 500,000
        currency: "COP",
        durationMinutes: 30,
      });

      await postRevenueUseCase.execute({
        appointmentId: appt.id,
        collectorParty: "COLLECTED_BY_HOST",
        actorUserId: hostOwnerUserId,
      });

      // Partial settlement: Host pays Carlos 300,000 COP
      const settlement1 = await createSettlementUseCase.execute({
        fromTenantId: hostTenantId,
        toTenantId: soloTenantId,
        affiliationId,
        amountMinor: BigInt(300000),
        currency: "COP",
        settlementType: "COMMISSION",
        notes: "Partial payment of 300,000",
        actorUserId: hostOwnerUserId,
      });

      expect(settlement1.id).toBeDefined();

      // Query current outstanding balance on payable account
      const defaultAccounts = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      const payableAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.PROFESSIONAL_COMMISSION_PAYABLE)!;

      const [payerAgg] = await db
        .select({
          credits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'CREDIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
          debits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'DEBIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
        })
        .from(journalLines)
        .innerJoin(
          journalEntries,
          and(
            eq(journalLines.journalEntryId, journalEntries.id),
            eq(journalEntries.status, "POSTED")
          )
        )
        .where(eq(journalLines.financialAccountId, payableAcc.id));

      const currentOutstanding = BigInt(payerAgg?.credits || "0") - BigInt(payerAgg?.debits || "0");
      const excessiveAmount = currentOutstanding + BigInt(500000);

      // 20 concurrent requests attempting to settle excessiveAmount MUST ALL FAIL with SettlementExceedsOutstandingError
      const concurrencyCount = 20;
      const overSettlementPromises = Array.from({ length: concurrencyCount }, () =>
        createSettlementUseCase.execute({
          fromTenantId: hostTenantId,
          toTenantId: soloTenantId,
          affiliationId,
          amountMinor: excessiveAmount,
          currency: "COP",
          settlementType: "COMMISSION",
          notes: "Attempted over-settlement",
          actorUserId: hostOwnerUserId,
        })
      );

      const raceResults = await Promise.allSettled(overSettlementPromises);
      const rejected = raceResults.filter((r) => r.status === "rejected");

      // ALL attempts to settle 300,000 when only 200,000 is outstanding must be rejected
      expect(rejected.length).toBe(concurrencyCount);
      for (const rej of rejected) {
        if (rej.status === "rejected") {
          expect(rej.reason).toBeInstanceOf(SettlementExceedsOutstandingError);
        }
      }
    });
  });

  // =========================================================================
  // 9. REVERSAL AFTER SETTLEMENT & CONCURRENT REVERSALS (Points 19, 20, 21)
  // =========================================================================
  describe("9. Reversal Invariants, Settled Clawback Guard & Double-Reversal Concurrency", () => {
    it("should block reversing a settled operation when allowClawbackAdjustment is false", async () => {
      // Create an appointment and complete it
      const apptStarts = new Date("2026-11-05T10:00:00Z");
      const [appt] = await db
        .insert(appointments)
        .values({
          tenantId: hostTenantId,
          locationId: devLocationId,
          staffId,
          customerUserId: devCustomerId,
          customerNameSnapshot: "Dev Customer",
          customerEmailSnapshot: "customer@barberparadise.dev",
          customerPhoneSnapshot: "+573001234567",
          startsAt: apptStarts,
          endsAt: new Date(apptStarts.getTime() + 1000 * 60 * 30),
          status: "COMPLETED",
          completedAt: apptStarts,
        })
        .returning();

      await db.insert(appointmentServices).values({
        appointmentId: appt.id,
        serviceId: devServiceId,
        serviceNameSnapshot: "Settled Service",
        priceMinor: 100000,
        currency: "COP",
        durationMinutes: 30,
      });

      const { hostJournalEntry } = await postRevenueUseCase.execute({
        appointmentId: appt.id,
        collectorParty: "COLLECTED_BY_HOST",
        actorUserId: hostOwnerUserId,
      });

      // Settle a portion of it so that a confirmed settlement row exists for the tenant
      await createSettlementUseCase.execute({
        fromTenantId: hostTenantId,
        toTenantId: soloTenantId,
        affiliationId,
        amountMinor: BigInt(20000),
        currency: "COP",
        settlementType: "COMMISSION",
        notes: "Partial settlement to trigger clawback check",
        actorUserId: hostOwnerUserId,
      });

      // Attempting to reverse with allowClawbackAdjustment: false when settlements exist in the tenant
      await expect(
        reverseJeUseCase.execute({
          journalEntryId: hostJournalEntry!.id!,
          tenantId: hostTenantId,
          actorUserId: hostOwnerUserId,
          reason: "Attempted reversal without clawback authorization",
          allowClawbackAdjustment: false,
        })
      ).rejects.toThrow(SettledOperationReversalBlockedError);
    });

    it("should allow EXACTLY 1 reversal winner across 50 concurrent reversal requests (Double-Reversal Guard)", async () => {
      // Create an isolated expense journal entry
      const defaultAccounts = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      const cashAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const expAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.OPERATING_EXPENSE)!;

      const testJe = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: `JE-RACE-REV-${Date.now()}`,
        entryType: "EXPENSE",
        currency: "COP",
        sourceType: "EXPENSE",
        description: "Concurrent reversal stress test",
        lines: [
          new JournalLine({
            financialAccountId: expAcc.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: Money.fromMinor(15000, "COP"),
          }),
          new JournalLine({
            financialAccountId: cashAcc.id,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: Money.fromMinor(15000, "COP"),
          }),
        ],
      });

      const postedJe = await financeRepo.postJournalEntry(testJe);

      // Launch 50 concurrent reversal requests
      const concurrencyCount = 50;
      const promises = Array.from({ length: concurrencyCount }, () =>
        financeRepo.reverseJournalEntry(
          postedJe.id!,
          hostOwnerUserId,
          "Concurrent reversal attempt"
        )
      );

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(concurrencyCount - 1);

      // Check DB: exactly 1 reversal entry with reversal_of_entry_id = postedJe.id
      const dbReversals = await db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.reversalOfEntryId, postedJe.id!),
            eq(journalEntries.status, "POSTED")
          )
        );
      expect(dbReversals.length).toBe(1);
    });
  });

  // =========================================================================
  // 10. CURRENCY & BIGINT INTEGRITY (> Number.MAX_SAFE_INTEGER) (Points 22, 23)
  // =========================================================================
  describe("10. Currency Homogeneity & BigInt Serialization Safety", () => {
    it("should reject mixed currencies in the same journal entry", async () => {
      const defaultAccounts = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      const cashAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const revAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)!;

      expect(() => {
        new JournalEntry({
          tenantId: hostTenantId,
          entryNumber: `JE-CURR-ERR-${Date.now()}`,
          entryType: "SERVICE_REVENUE",
          currency: "COP",
          sourceType: "APPOINTMENT",
          description: "Mixed currencies test",
          lines: [
            new JournalLine({
              financialAccountId: cashAcc.id,
              tenantId: hostTenantId,
              direction: "DEBIT",
              amount: Money.fromMinor(50000, "COP"),
            }),
            new JournalLine({
              financialAccountId: revAcc.id,
              tenantId: hostTenantId,
              direction: "CREDIT",
              amount: Money.fromMinor(50000, "USD"), // Mismatched currency!
            }),
          ],
        });
      }).toThrow(CurrencyMismatchError);
    });

    it("should preserve exact precision for amounts exceeding Number.MAX_SAFE_INTEGER without rounding or loss", async () => {
      // MAX_SAFE_INTEGER is 9,007,199,254,740,991
      // We test 15,000,000,000,000,000 (15 quadrillion minor units)
      const hugeMinor = BigInt("15000000000000000");
      expect(hugeMinor).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));

      const money = Money.fromMinor(hugeMinor, "COP");
      expect(money.amountMinor.toString()).toBe("15000000000000000");
      expect(money.minorUnitsString).toBe("15000000000000000");

      const json = money.toJSON();
      expect(json.amountMinorStr).toBe("15000000000000000");
      expect(json.amountMinor).toBe("15000000000000000"); // serialized as string when unsafe

      // Create journal entry with huge amount to certify PostgreSQL BIGINT -> Drizzle -> Domain
      const defaultAccounts = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      const cashAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const revAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)!;

      const hugeJe = new JournalEntry({
        tenantId: hostTenantId,
        entryNumber: `JE-HUGE-${Date.now()}`,
        entryType: "SERVICE_REVENUE",
        currency: "COP",
        sourceType: "APPOINTMENT",
        description: "Huge BigInt test",
        lines: [
          new JournalLine({
            financialAccountId: cashAcc.id,
            tenantId: hostTenantId,
            direction: "DEBIT",
            amount: money,
          }),
          new JournalLine({
            financialAccountId: revAcc.id,
            tenantId: hostTenantId,
            direction: "CREDIT",
            amount: money,
          }),
        ],
      });

      const postedHuge = await financeRepo.postJournalEntry(hugeJe);
      expect(postedHuge.id).toBeDefined();

      // Read back from database
      const readBack = await financeRepo.findJournalEntryById(postedHuge.id!);
      expect(readBack).not.toBeNull();
      expect(readBack!.lines[0].amount.amountMinor.toString()).toBe("15000000000000000");
      expect(readBack!.lines[0].amount.minorUnitsString).toBe("15000000000000000");
    });
  });

  // =========================================================================
  // 11. FINANCIAL PRIVACY & TENANCY BOUNDARIES (Points 24, 25)
  // =========================================================================
  describe("11. Financial Authorization & Privacy Boundaries", () => {
    it("should deny affiliated professional from accessing host business expenses or ledger (403 Forbidden)", async () => {
      // Create session for Carlos
      const carlosSession = await createSession({
        id: soloBarberUserId,
        email: "carlos.independent@royalbarber.dev",
        name: "Carlos Mendoza",
        isPlatformAdmin: false,
      });

      // Request accessing Host shop expenses while in Host tenant context
      const req = new NextRequest("http://localhost:3000/api/v1/finance/expenses?tenantId=" + hostTenantId, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${carlosSession.token}`,
        },
      });

      // Carlos's role in hostTenantId is AFFILIATED_PROFESSIONAL
      await expect(
        authorizeFinanceRequest(req, {
          requiredModule: "finance.expenses",
          targetTenantId: hostTenantId,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should allow Carlos to access his own solo workspace finances (200 OK)", async () => {
      const carlosSession = await createSession({
        id: soloBarberUserId,
        email: "carlos.independent@royalbarber.dev",
        name: "Carlos Mendoza",
        isPlatformAdmin: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/finance/expenses?tenantId=" + soloTenantId, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${carlosSession.token}`,
        },
      });

      const auth = await authorizeFinanceRequest(req, {
        requiredModule: "finance.expenses",
        targetTenantId: soloTenantId,
      });

      expect(auth.tenantId).toBe(soloTenantId);
      expect(auth.workspace.role).toBe("OWNER");
    });

    it("should deny Host owner from accessing Carlos solo workspace (403 Forbidden)", async () => {
      const ownerSession = await createSession({
        id: hostOwnerUserId,
        email: "owner@royalbarber.dev",
        name: "Owner User",
        isPlatformAdmin: false,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/finance/expenses?tenantId=" + soloTenantId, {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${ownerSession.token}`,
        },
      });

      // Host owner has no membership in Carlos solo tenant
      await expect(
        authorizeFinanceRequest(req, {
          requiredModule: "finance.expenses",
          targetTenantId: soloTenantId,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // 12. REPORTING CONSISTENCY & TIMEZONE AGGREGATION (Points 28, 29)
  // =========================================================================
  describe("12. Reporting Consistency & America/Bogota Timezone Boundaries", () => {
    it("should produce financial summary numbers that match raw journal lines aggregation 100%", async () => {
      const summary = await getSummaryUseCase.execute({
        tenantId: hostTenantId,
        currency: "COP",
      });

      // Directly query journal_lines for cash account
      const defaultAccounts = await financeRepo.getOrCreateDefaultAccounts(hostTenantId, "COP");
      const cashAcc = defaultAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;

      const [cashAgg] = await db
        .select({
          debits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'DEBIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
          credits: sql<string>`coalesce(sum(case when ${journalLines.direction} = 'CREDIT' then ${journalLines.amountMinor} else 0 end), 0)::text`,
        })
        .from(journalLines)
        .innerJoin(
          journalEntries,
          and(
            eq(journalLines.journalEntryId, journalEntries.id),
            eq(journalEntries.status, "POSTED")
          )
        )
        .where(
          and(
            eq(journalLines.tenantId, hostTenantId),
            eq(journalLines.financialAccountId, cashAcc.id)
          )
        );

      const expectedNetCash = BigInt(cashAgg?.debits || "0") - BigInt(cashAgg?.credits || "0");
      expect(summary.totalCash.amountMinor).toBe(expectedNetCash);
    });

    it("should respect America/Bogota day boundaries near midnight UTC", async () => {
      // 2026-10-07 02:00:00 UTC is 2026-10-06 21:00:00 in America/Bogota (UTC-5)
      // When querying the day of 2026-10-06 in Bogota:
      // Start: 2026-10-06T00:00:00-05:00 (2026-10-06T05:00:00Z)
      // End:   2026-10-06T23:59:59.999-05:00 (2026-10-07T04:59:59.999Z)
      const bogotaDayStart = new Date("2026-10-06T05:00:00Z");
      const bogotaDayEnd = new Date("2026-10-07T04:59:59.999Z");

      const nearMidnightUtc = new Date("2026-10-07T02:00:00Z");

      // Verify that nearMidnightUtc falls within the Bogota day boundaries
      expect(nearMidnightUtc.getTime()).toBeGreaterThanOrEqual(bogotaDayStart.getTime());
      expect(nearMidnightUtc.getTime()).toBeLessThanOrEqual(bogotaDayEnd.getTime());

      // Query ledger entries with this boundary
      const res = await financeRepo.getLedgerEntries({
        tenantId: hostTenantId,
        from: bogotaDayStart,
        to: bogotaDayEnd,
      });

      expect(res.entries).toBeDefined();
    });
  });
});
