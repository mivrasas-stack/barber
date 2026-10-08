import crypto from "crypto";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  journalEntries,
  journalLines,
  auditLogs,
  outboxEvents,
} from "@/infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { PaymentProviderFactory } from "../infrastructure/providers/provider-factory";
import { Refund } from "../domain/refund";
import {
  PaymentNotFoundError,
  RefundNotAllowedError,
  RefundExceedsCapturedAmountError,
} from "../domain/payment-errors";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { STANDARD_ACCOUNT_CODES } from "@/modules/finance/domain/financial-account";

export interface RequestRefundInput {
  paymentIntentId: string;
  amountMinor: bigint;
  reason: string;
  orderReturnId?: string;
  idempotencyKey?: string;
  actorUserId?: string;
}

export interface RequestRefundOutput {
  id: string;
  paymentIntentId: string;
  orderId: string;
  amountMinor: string;
  currency: string;
  status: string;
  providerRefundId?: string | null;
  completedAt?: Date | null;
}

export class RequestRefundUseCase {
  private readonly financeRepository = new DrizzleFinanceRepository();

  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: RequestRefundInput): Promise<RequestRefundOutput> {
    if (input.amountMinor <= 0n) {
      throw new RefundNotAllowedError("Refund amount must be strictly positive");
    }

    let keyHash: string | undefined;
    if (input.idempotencyKey) {
      keyHash = crypto
        .createHash("sha256")
        .update(`${input.idempotencyKey}:${input.paymentIntentId}:${input.amountMinor.toString()}`)
        .digest("hex");
    }

    return await db.transaction(async (tx) => {
      // 1. Lock PaymentIntent
      const intent = await this.paymentRepository.findIntentByIdForUpdate(
        input.paymentIntentId,
        tx
      );

      if (!intent) {
        throw new PaymentNotFoundError(input.paymentIntentId);
      }

      if (!intent.orderId) {
        throw new RefundNotAllowedError("Refunds are only supported for order payments");
      }
      const orderId = intent.orderId;

      if (intent.status !== "SUCCEEDED") {
        throw new RefundNotAllowedError(
          `Cannot refund payment in '${intent.status}' status (must be SUCCEEDED)`
        );
      }

      // 2. Concurrency & Overflow guard: Check existing refunds
      const existingRefunds = await this.paymentRepository.listRefundsByPaymentId(
        intent.id!,
        tx
      );

      let totalRefunded = 0n;
      for (const r of existingRefunds) {
        if (r.status === "SUCCEEDED" || r.status === "PROCESSING" || r.status === "REQUESTED") {
          totalRefunded += r.amountMinor;
        }
      }

      const refundableRemaining = intent.amountMinor - totalRefunded;
      if (input.amountMinor > refundableRemaining) {
        throw new RefundExceedsCapturedAmountError(input.amountMinor, refundableRemaining);
      }

      // 3. Provider Call
      const provider = PaymentProviderFactory.getProvider(intent.provider);
      const refundResult = await provider.refundPayment({
        providerTransactionId: intent.providerTransactionId ?? "tx_unknown",
        amountMinor: input.amountMinor,
        currency: intent.currency,
        reason: input.reason,
      });

      // 4. Create and save Refund entity
      const refund = new Refund({
        paymentIntentId: intent.id!,
        orderId: orderId,
        collectorTenantId: intent.collectorTenantId,
        orderReturnId: input.orderReturnId,
        amountMinor: input.amountMinor,
        currency: intent.currency,
        reason: input.reason,
        status: refundResult.status === "APPROVED" ? "SUCCEEDED" : "PROCESSING",
        providerRefundId: refundResult.providerRefundId,
        idempotencyKeyHash: keyHash,
        createdByUserId: input.actorUserId,
        completedAt: refundResult.status === "APPROVED" ? new Date() : null,
      });

      const savedRefund = await this.paymentRepository.saveRefund(refund, tx);

      // 5. Post Symmetrical Financial Reversal into Double-Entry Ledger
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      const accounts = await this.financeRepository.getOrCreateDefaultAccounts(
        intent.collectorTenantId,
        intent.currency,
        tx
      );

      const clearingAcc = accounts.get(STANDARD_ACCOUNT_CODES.PAYMENT_PROVIDER_CLEARING)!;
      const revenueAcc = accounts.get(STANDARD_ACCOUNT_CODES.PRODUCT_SALES_REVENUE)!;

      const entryNumber = `JE-REF-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      const [journal] = await tx
        .insert(journalEntries)
        .values({
          tenantId: intent.collectorTenantId,
          entryNumber,
          entryType: "PAYMENT_REFUND",
          currency: intent.currency,
          sourceType: "REFUND",
          sourceId: savedRefund.id,
          description: `Monetary refund via ${intent.provider} for Order #${order?.orderNumber ?? "N/A"} (Reason: ${input.reason})`,
          status: "POSTED",
        })
        .returning();

      // DEBIT Revenue (reduces recognized revenue)
      await tx.insert(journalLines).values({
        journalEntryId: journal.id,
        financialAccountId: revenueAcc.id,
        tenantId: intent.collectorTenantId,
        direction: "DEBIT",
        amountMinor: input.amountMinor,
        memo: `Refund reversal - Order #${order?.orderNumber ?? "N/A"}`,
      });

      // CREDIT Payment Clearing (reduces expected clearing funds)
      await tx.insert(journalLines).values({
        journalEntryId: journal.id,
        financialAccountId: clearingAcc.id,
        tenantId: intent.collectorTenantId,
        direction: "CREDIT",
        amountMinor: input.amountMinor,
        memo: `Provider refund payout - Order #${order?.orderNumber ?? "N/A"}`,
      });

      // 6. Audit & Outbox
      await tx.insert(auditLogs).values({
        tenantId: intent.collectorTenantId,
        actorUserId: input.actorUserId,
        action: "refund.succeeded",
        entityType: "refund",
        entityId: savedRefund.id,
        metadata: {
          paymentIntentId: intent.id,
          orderId: orderId,
          amountMinor: input.amountMinor.toString(),
          reason: input.reason,
        },
      });

      await tx.insert(outboxEvents).values({
        tenantId: intent.collectorTenantId,
        aggregateId: savedRefund.id!,
        eventType: "payment.refund.succeeded.v1",
        payload: {
          refundId: savedRefund.id,
          paymentIntentId: intent.id,
          orderId: orderId,
          amountMinor: input.amountMinor.toString(),
          currency: intent.currency,
        },
      });

      return {
        id: savedRefund.id!,
        paymentIntentId: intent.id!,
        orderId: orderId,
        amountMinor: savedRefund.amountMinor.toString(),
        currency: savedRefund.currency,
        status: savedRefund.status,
        providerRefundId: savedRefund.providerRefundId,
        completedAt: savedRefund.completedAt,
      };
    });
  }
}
