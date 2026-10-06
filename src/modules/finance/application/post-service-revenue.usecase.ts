import { eq, and, lte, or, isNull, gt, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { appointments, appointmentServices } from "@/infrastructure/database/schema/appointments";
import { staffProfiles } from "@/infrastructure/database/schema/staff";
import {
  professionalAffiliations,
  professionalAffiliationTerms,
} from "@/infrastructure/database/schema/professionals";
import { professionalAffiliationTermVersions } from "@/infrastructure/database/schema/finance";
import { IFinanceRepository } from "../domain/finance-repository.interface";
import { JournalEntry } from "../domain/journal-entry";
import { JournalLine } from "../domain/journal-line";
import { Money } from "../domain/money";
import {
  SettlementPolicy,
  CollectorParty,
  SettlementModel,
} from "../domain/settlement-policy";
import { STANDARD_ACCOUNT_CODES } from "../domain/financial-account";
import { NotFoundError } from "@/shared/errors/app-error";

export interface PostServiceRevenueInput {
  appointmentId: string;
  actorUserId?: string | null;
  collectorParty?: CollectorParty;
  tipMinor?: bigint | number;
  tx?: any;
}

export interface PostServiceRevenueResult {
  hostJournalEntry?: JournalEntry;
  professionalJournalEntry?: JournalEntry;
  grossServiceAmount: Money;
  tipAmount: Money;
  hostCommissionAmount: Money;
  professionalShare: Money;
  collectorParty: CollectorParty;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostServiceRevenueUseCase {
  constructor(private readonly financeRepository: IFinanceRepository) {}

  async execute(input: PostServiceRevenueInput): Promise<PostServiceRevenueResult> {
    const client = input.tx ?? db;
    const safeActorUserId =
      input.actorUserId && UUID_REGEX.test(input.actorUserId)
        ? input.actorUserId
        : null;

    // 1. Fetch appointment
    const [appointment] = await client
      .select()
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);

    if (!appointment) {
      throw new NotFoundError("Appointment", input.appointmentId);
    }

    // Check if already posted for host tenant
    const existingHostEntry = await this.financeRepository.findJournalEntryBySource(
      "APPOINTMENT",
      input.appointmentId,
      "SERVICE_REVENUE",
      appointment.tenantId,
      client
    );

    // 2. Fetch appointment services snapshots
    const serviceRows = await client
      .select()
      .from(appointmentServices)
      .where(eq(appointmentServices.appointmentId, input.appointmentId));

    if (serviceRows.length === 0) {
      throw new Error(`Appointment ${input.appointmentId} has no service items to financialize.`);
    }

    const currency = (serviceRows[0].currency || "COP").toUpperCase();
    let totalGrossMinor = BigInt(0);
    for (const sr of serviceRows) {
      totalGrossMinor += BigInt(sr.priceMinor);
    }

    const tipMinor = input.tipMinor ? BigInt(input.tipMinor) : BigInt(0);

    // 3. Resolve Staff & Commercial Affiliation Terms (if applicable)
    let affiliationTermsRow: {
      affiliationId: string;
      professionalWorkspaceTenantId: string;
      settlementModel: SettlementModel;
      commissionBasisPoints: number | null;
      fixedRentAmountMinor: number | null;
      termVersionNumber: number;
    } | null = null;

    if (appointment.staffId) {
      const [staff] = await client
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.id, appointment.staffId))
        .limit(1);

      if (staff?.professionalProfileId) {
        // Query active affiliation between this professional and appointment's tenant
        const [affil] = await client
          .select()
          .from(professionalAffiliations)
          .where(
            and(
              eq(professionalAffiliations.professionalProfileId, staff.professionalProfileId),
              eq(professionalAffiliations.hostTenantId, appointment.tenantId),
              eq(professionalAffiliations.status, "ACTIVE")
            )
          )
          .limit(1);

        if (affil) {
          const appointmentDate = appointment.startsAt || appointment.completedAt || new Date();
          // First query historical term versions valid at the time of appointment
          const [termVersion] = await client
            .select()
            .from(professionalAffiliationTermVersions)
            .where(
              and(
                eq(professionalAffiliationTermVersions.affiliationId, affil.id),
                lte(professionalAffiliationTermVersions.effectiveFrom, appointmentDate),
                or(
                  isNull(professionalAffiliationTermVersions.effectiveUntil),
                  gt(professionalAffiliationTermVersions.effectiveUntil, appointmentDate)
                )
              )
            )
            .orderBy(desc(professionalAffiliationTermVersions.versionNumber))
            .limit(1);

          if (termVersion) {
            affiliationTermsRow = {
              affiliationId: affil.id,
              professionalWorkspaceTenantId: affil.professionalWorkspaceTenantId,
              settlementModel: termVersion.settlementModel as SettlementModel,
              commissionBasisPoints: termVersion.commissionBasisPoints,
              fixedRentAmountMinor: termVersion.fixedRentAmountMinor ? Number(termVersion.fixedRentAmountMinor) : null,
              termVersionNumber: termVersion.versionNumber,
            };
          } else {
            // Fallback to active terms table
            const [terms] = await client
              .select()
              .from(professionalAffiliationTerms)
              .where(eq(professionalAffiliationTerms.affiliationId, affil.id))
              .limit(1);

            if (terms) {
              affiliationTermsRow = {
                affiliationId: affil.id,
                professionalWorkspaceTenantId: affil.professionalWorkspaceTenantId,
                settlementModel: terms.settlementModel as SettlementModel,
                commissionBasisPoints: terms.commissionBasisPoints,
                fixedRentAmountMinor: terms.fixedRentAmountMinor,
                termVersionNumber: 1,
              };
            }
          }
        }
      }
    }

    const collectorParty: CollectorParty = input.collectorParty ?? "COLLECTED_BY_HOST";

    const breakdown = SettlementPolicy.calculateServiceBreakdown({
      serviceGrossMinor: totalGrossMinor,
      tipMinor,
      currency,
      settlementModel: affiliationTermsRow?.settlementModel,
      commissionBasisPoints: affiliationTermsRow?.commissionBasisPoints,
      collectorParty,
      fixedRentAmountMinor: affiliationTermsRow?.fixedRentAmountMinor
        ? BigInt(affiliationTermsRow.fixedRentAmountMinor)
        : null,
    });

    // If already posted, return existing data idempotently
    if (existingHostEntry) {
      return {
        hostJournalEntry: existingHostEntry,
        grossServiceAmount: breakdown.grossServiceAmount,
        tipAmount: breakdown.tipAmount,
        hostCommissionAmount: breakdown.hostCommissionAmount,
        professionalShare: breakdown.professionalTotalShare,
        collectorParty,
      };
    }

    // 4. Post Journal Entry for Host Tenant
    const hostAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
      appointment.tenantId,
      currency,
      client
    );

    const hostCashAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
    const hostServiceRevAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)!;
    const hostCommRevAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.COMMISSION_REVENUE)!;
    const hostProfPayableAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.PROFESSIONAL_COMMISSION_PAYABLE)!;
    const hostCommRecAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.HOST_COMMISSION_RECEIVABLE)!;
    const hostTipsPayableAcc = hostAccounts.get(STANDARD_ACCOUNT_CODES.TIPS_PAYABLE)!;

    const hostLines: JournalLine[] = [];

    if (!affiliationTermsRow) {
      // Traditional staff/employee in Host shop
      // DEBIT Cash (Total collected)
      // CREDIT Service Revenue (Gross)
      // CREDIT Tips Payable (Tip if any)
      hostLines.push(
        new JournalLine({
          financialAccountId: hostCashAcc.id,
          tenantId: appointment.tenantId,
          direction: "DEBIT",
          amount: breakdown.totalCollected,
          memo: `Appointment cash collection: ${appointment.id}`,
        })
      );
      hostLines.push(
        new JournalLine({
          financialAccountId: hostServiceRevAcc.id,
          tenantId: appointment.tenantId,
          direction: "CREDIT",
          amount: breakdown.grossServiceAmount,
          memo: `Service revenue for appointment: ${appointment.id}`,
        })
      );
      if (breakdown.tipAmount.isPositive()) {
        hostLines.push(
          new JournalLine({
            financialAccountId: hostTipsPayableAcc.id,
            tenantId: appointment.tenantId,
            direction: "CREDIT",
            amount: breakdown.tipAmount,
            memo: `Tip payable for appointment: ${appointment.id}`,
          })
        );
      }
    } else {
      // Independent professional with commercial affiliation
      if (collectorParty === "COLLECTED_BY_HOST") {
        // Host collected all cash
        // DEBIT Cash (totalCollected)
        // CREDIT Commission Revenue (hostCommissionAmount)
        // CREDIT Professional Commission Payable (professionalServiceShare)
        // CREDIT Tips Payable (tipAmount)
        hostLines.push(
          new JournalLine({
            financialAccountId: hostCashAcc.id,
            tenantId: appointment.tenantId,
            direction: "DEBIT",
            amount: breakdown.totalCollected,
            memo: `Customer payment received at host front-desk`,
          })
        );

        if (breakdown.hostCommissionAmount.isPositive()) {
          hostLines.push(
            new JournalLine({
              financialAccountId: hostCommRevAcc.id,
              tenantId: appointment.tenantId,
              direction: "CREDIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Host commission earned (${breakdown.commissionBasisPoints} bp)`,
            })
          );
        }

        if (breakdown.professionalServiceShare.isPositive()) {
          hostLines.push(
            new JournalLine({
              financialAccountId: hostProfPayableAcc.id,
              tenantId: appointment.tenantId,
              direction: "CREDIT",
              amount: breakdown.professionalServiceShare,
              memo: `Professional service share payable`,
            })
          );
        }

        if (breakdown.tipAmount.isPositive()) {
          hostLines.push(
            new JournalLine({
              financialAccountId: hostTipsPayableAcc.id,
              tenantId: appointment.tenantId,
              direction: "CREDIT",
              amount: breakdown.tipAmount,
              memo: `Customer tip payable to professional`,
            })
          );
        }
      } else {
        // COLLECTED_BY_PROFESSIONAL
        // Professional collected cash directly. Host records receivable commission from professional.
        // DEBIT Host Commission Receivable (hostCommissionAmount)
        // CREDIT Commission Revenue (hostCommissionAmount)
        if (breakdown.hostCommissionAmount.isPositive()) {
          hostLines.push(
            new JournalLine({
              financialAccountId: hostCommRecAcc.id,
              tenantId: appointment.tenantId,
              direction: "DEBIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Receivable commission from professional`,
            })
          );
          hostLines.push(
            new JournalLine({
              financialAccountId: hostCommRevAcc.id,
              tenantId: appointment.tenantId,
              direction: "CREDIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Commission revenue earned`,
            })
          );
        }
      }
    }

    let postedHostJe: JournalEntry | undefined;
    if (hostLines.length >= 2) {
      const hostJe = new JournalEntry({
        tenantId: appointment.tenantId,
        entryNumber: `JE-HOST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entryType: "SERVICE_REVENUE",
        currency,
        sourceType: "APPOINTMENT",
        sourceId: appointment.id,
        description: `Service revenue for appointment ${appointment.id}`,
        createdByUserId: safeActorUserId,
        metadata: {
          correlationId: appointment.id,
          financialOperationId: `op_appt_${appointment.id}`,
          counterpartyTenantId: affiliationTermsRow?.professionalWorkspaceTenantId || null,
          termVersionNumber: affiliationTermsRow?.termVersionNumber || null,
          settlementModel: affiliationTermsRow?.settlementModel || "EMPLOYEE",
          commissionBasisPoints: breakdown.commissionBasisPoints,
          collectorParty,
          grossMinor: breakdown.grossServiceAmount.minorUnitsString,
          professionalShareMinor: breakdown.professionalTotalShare.minorUnitsString,
          hostCommissionMinor: breakdown.hostCommissionAmount.minorUnitsString,
          tipMinor: breakdown.tipAmount.minorUnitsString,
        },
        lines: hostLines,
      });

      postedHostJe = await this.financeRepository.postJournalEntry(hostJe, client);
    }

    // 5. Post Journal Entry for Professional Solo Workspace (if affiliated)
    let postedProfJe: JournalEntry | undefined;
    if (affiliationTermsRow?.professionalWorkspaceTenantId) {
      const profTenantId = affiliationTermsRow.professionalWorkspaceTenantId;
      const profAccounts = await this.financeRepository.getOrCreateDefaultAccounts(
        profTenantId,
        currency,
        client
      );

      const profCashAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.CASH)!;
      const profServiceRevAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.SERVICE_REVENUE)!;
      const profCommExpAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.COMMISSION_EXPENSE)!;
      const profCommPayableAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.HOST_COMMISSION_PAYABLE)!;
      const profCommRecAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.HOST_COMMISSION_RECEIVABLE)!;
      const profTipRevAcc = profAccounts.get(STANDARD_ACCOUNT_CODES.TIP_REVENUE)!;

      const profLines: JournalLine[] = [];

      if (collectorParty === "COLLECTED_BY_HOST") {
        // Host has money: Carlos has receivable from Host, incurred commission expense, earned service & tip revenue
        // DEBIT Host Receivable: breakdown.professionalTotalShare
        // DEBIT Commission Expense: breakdown.hostCommissionAmount
        // CREDIT Service Revenue: breakdown.grossServiceAmount
        // CREDIT Tip Revenue: breakdown.tipAmount (if positive)
        profLines.push(
          new JournalLine({
            financialAccountId: profCommRecAcc.id,
            tenantId: profTenantId,
            direction: "DEBIT",
            amount: breakdown.professionalTotalShare,
            memo: `Receivable from host for services performed`,
          })
        );

        if (breakdown.hostCommissionAmount.isPositive()) {
          profLines.push(
            new JournalLine({
              financialAccountId: profCommExpAcc.id,
              tenantId: profTenantId,
              direction: "DEBIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Host commission expense`,
            })
          );
        }

        profLines.push(
          new JournalLine({
            financialAccountId: profServiceRevAcc.id,
            tenantId: profTenantId,
            direction: "CREDIT",
            amount: breakdown.grossServiceAmount,
            memo: `Service revenue earned`,
          })
        );

        if (breakdown.tipAmount.isPositive()) {
          profLines.push(
            new JournalLine({
              financialAccountId: profTipRevAcc.id,
              tenantId: profTenantId,
              direction: "CREDIT",
              amount: breakdown.tipAmount,
              memo: `Tip revenue received`,
            })
          );
        }
      } else {
        // COLLECTED_BY_PROFESSIONAL
        // Carlos has cash, earned revenue, owes commission to Host
        // DEBIT Cash: breakdown.totalCollected
        // CREDIT Service Revenue: breakdown.grossServiceAmount
        // CREDIT Tip Revenue: breakdown.tipAmount (if positive)
        // DEBIT Commission Expense: breakdown.hostCommissionAmount (if positive)
        // CREDIT Host Commission Payable: breakdown.hostCommissionAmount (if positive)
        profLines.push(
          new JournalLine({
            financialAccountId: profCashAcc.id,
            tenantId: profTenantId,
            direction: "DEBIT",
            amount: breakdown.totalCollected,
            memo: `Cash collected directly from customer`,
          })
        );

        profLines.push(
          new JournalLine({
            financialAccountId: profServiceRevAcc.id,
            tenantId: profTenantId,
            direction: "CREDIT",
            amount: breakdown.grossServiceAmount,
            memo: `Service revenue earned`,
          })
        );

        if (breakdown.tipAmount.isPositive()) {
          profLines.push(
            new JournalLine({
              financialAccountId: profTipRevAcc.id,
              tenantId: profTenantId,
              direction: "CREDIT",
              amount: breakdown.tipAmount,
              memo: `Tip revenue received`,
            })
          );
        }

        if (breakdown.hostCommissionAmount.isPositive()) {
          profLines.push(
            new JournalLine({
              financialAccountId: profCommExpAcc.id,
              tenantId: profTenantId,
              direction: "DEBIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Commission expense owed to host`,
            })
          );

          profLines.push(
            new JournalLine({
              financialAccountId: profCommPayableAcc.id,
              tenantId: profTenantId,
              direction: "CREDIT",
              amount: breakdown.hostCommissionAmount,
              memo: `Commission payable to host`,
            })
          );
        }
      }

      if (profLines.length >= 2) {
        const profJe = new JournalEntry({
          tenantId: profTenantId,
          entryNumber: `JE-PROF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          entryType: "SERVICE_REVENUE",
          currency,
          sourceType: "APPOINTMENT",
          sourceId: appointment.id,
          description: `Service revenue for appointment ${appointment.id}`,
          createdByUserId: safeActorUserId,
          metadata: {
            correlationId: appointment.id,
            financialOperationId: `op_appt_${appointment.id}`,
            counterpartyTenantId: appointment.tenantId,
            termVersionNumber: affiliationTermsRow?.termVersionNumber || null,
            settlementModel: affiliationTermsRow?.settlementModel || "COMMISSION",
            commissionBasisPoints: breakdown.commissionBasisPoints,
            collectorParty,
            grossMinor: breakdown.grossServiceAmount.minorUnitsString,
            professionalShareMinor: breakdown.professionalTotalShare.minorUnitsString,
            hostCommissionMinor: breakdown.hostCommissionAmount.minorUnitsString,
            tipMinor: breakdown.tipAmount.minorUnitsString,
          },
          lines: profLines,
        });

        postedProfJe = await this.financeRepository.postJournalEntry(profJe, client);
      }
    }

    return {
      hostJournalEntry: postedHostJe,
      professionalJournalEntry: postedProfJe,
      grossServiceAmount: breakdown.grossServiceAmount,
      tipAmount: breakdown.tipAmount,
      hostCommissionAmount: breakdown.hostCommissionAmount,
      professionalShare: breakdown.professionalTotalShare,
      collectorParty,
    };
  }
}
