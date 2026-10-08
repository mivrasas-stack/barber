import crypto from "crypto";
import { db } from "@/infrastructure/database/client";
import {
  orders,
  orderItems,
  orderTenders,
  inventoryPositions,
  auditLogs,
  outboxEvents,
} from "@/infrastructure/database/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { PaymentProviderFactory } from "../infrastructure/providers/provider-factory";
import { PaymentIntent } from "../domain/payment-intent";
import { PaymentAttempt } from "../domain/payment-attempt";
import { InventoryReservation } from "../domain/inventory-reservation";
import { PaymentProviderType } from "../domain/payment-provider.interface";
import {
  PaymentAmountExceedsOrderBalanceError,
  PaymentProviderUnavailableError,
} from "../domain/payment-errors";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

export interface CreatePaymentIntentInput {
  orderId: string;
  collectorTenantId: string;
  providerType: PaymentProviderType;
  amountMinor?: bigint;
  paymentMethodType?: string;
  idempotencyKey?: string;
  actorUserId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  redirectUrl?: string;
}

export interface CreatePaymentIntentOutput {
  id: string;
  orderId: string;
  orderNumber: string;
  collectorTenantId: string;
  provider: PaymentProviderType;
  amountMinor: string;
  currency: string;
  status: string;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  checkoutUrl?: string;
  publicKey?: string;
  integritySignature?: string;
  expiresAt?: Date | null;
}

export class CreatePaymentIntentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
    // 1. Idempotency Key Handling
    let keyHash: string | undefined;
    if (input.idempotencyKey) {
      keyHash = crypto
        .createHash("sha256")
        .update(
          `${input.idempotencyKey}:${input.orderId}:${input.collectorTenantId}:${input.providerType}:${input.amountMinor?.toString() ?? "FULL"}`
        )
        .digest("hex");

      const existingIntent = await this.paymentRepository.findIntentByIdempotencyKeyHash(keyHash);
      if (existingIntent) {
        let orderNumber = "N/A";
        if (existingIntent.orderId) {
          const [existingOrder] = await db
            .select({ orderNumber: orders.orderNumber })
            .from(orders)
            .where(eq(orders.id, existingIntent.orderId))
            .limit(1);
          if (existingOrder) {
            orderNumber = existingOrder.orderNumber;
          }
        }

        return {
          id: existingIntent.id!,
          orderId: existingIntent.orderId ?? input.orderId,
          orderNumber,
          collectorTenantId: existingIntent.collectorTenantId,
          provider: existingIntent.provider,
          amountMinor: existingIntent.amountMinor.toString(),
          currency: existingIntent.currency,
          status: existingIntent.status,
          providerReference: existingIntent.providerReference,
          providerTransactionId: existingIntent.providerTransactionId,
          expiresAt: existingIntent.expiresAt,
        };
      }
    }

    return await db.transaction(async (tx) => {
      // 2. Lock Order and validate status
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new NotFoundError(`Order '${input.orderId}' not found`);
      }

      if (order.status === "COMPLETED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
        throw new ConflictError(
          `ORDER_ALREADY_SETTLED: Cannot initiate payment for order in '${order.status}' status`
        );
      }

      // Calculate remaining payable
      const existingTenders = await tx
        .select()
        .from(orderTenders)
        .where(eq(orderTenders.orderId, order.id));

      let verifiedTenderTotal = 0n;
      for (const t of existingTenders) {
        if (t.verificationStatus === "PROVIDER_VERIFIED" || t.verificationStatus === "MANUAL_DECLARED") {
          verifiedTenderTotal += BigInt(t.amountMinor);
        }
      }

      const activeIntents = await this.paymentRepository.listIntents(
        { orderId: order.id, status: "PENDING" },
        tx
      );
      let pendingIntentsTotal = 0n;
      for (const pi of activeIntents) {
        pendingIntentsTotal += pi.amountMinor;
      }

      const orderTotal = BigInt(order.grandTotalMinor);
      const remainingPayable = orderTotal - verifiedTenderTotal - pendingIntentsTotal;

      if (remainingPayable <= 0n) {
        throw new PaymentAmountExceedsOrderBalanceError(0n, remainingPayable);
      }

      const targetAmount = input.amountMinor ? input.amountMinor : remainingPayable;
      if (targetAmount > remainingPayable) {
        throw new PaymentAmountExceedsOrderBalanceError(targetAmount, remainingPayable);
      }

      // 3. Inventory Reservation for physical products
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const productItems = items.filter(
        (i) => i.itemType === "PRODUCT" && i.productVariantId
      );

      // Lock positions in deterministic order to prevent deadlocks
      const sortedPositions = [...productItems].sort((a, b) =>
        (a.productVariantId || "").localeCompare(b.productVariantId || "")
      );

      const reservationList: {
        productVariantId: string;
        locationId: string;
        ownerTenantId: string;
        quantity: number;
      }[] = [];

      for (const item of sortedPositions) {
        if (!item.productVariantId) continue;
        if (!order.locationId) {
          throw new ConflictError("Order must be associated with a location to reserve stock");
        }
        const orderLocationId = order.locationId;

        const [position] = await tx
          .select()
          .from(inventoryPositions)
          .where(
            and(
              eq(inventoryPositions.productVariantId, item.productVariantId),
              eq(inventoryPositions.locationId, orderLocationId),
              eq(inventoryPositions.ownerTenantId, item.sellerTenantId)
            )
          )
          .for("update")
          .limit(1);

        if (!position) {
          throw new ConflictError(
            `INSUFFICIENT_STOCK: No inventory position exists for product variant '${item.productVariantId}' at location`
          );
        }

        const available = position.onHand - position.reserved;
        if (available < item.quantity) {
          throw new ConflictError(
            `INSUFFICIENT_STOCK: Required ${item.quantity} units of '${item.descriptionSnapshot}', but only ${available} available`
          );
        }

        // Increment reserved
        await tx
          .update(inventoryPositions)
          .set({
            reserved: position.reserved + item.quantity,
            updatedAt: new Date(),
          })
          .where(eq(inventoryPositions.id, position.id));

        reservationList.push({
          productVariantId: item.productVariantId,
          locationId: orderLocationId,
          ownerTenantId: item.sellerTenantId,
          quantity: item.quantity,
        });
      }

      // 4. Create and persist initial PaymentIntent
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiration
      const intentDomain = new PaymentIntent({
        orderId: order.id,
        collectorTenantId: input.collectorTenantId,
        provider: input.providerType,
        amountMinor: targetAmount,
        currency: order.currency,
        status: "PENDING",
        idempotencyKeyHash: keyHash,
        expiresAt,
        paymentMethodType: input.paymentMethodType,
        createdByUserId: input.actorUserId,
      });

      const savedIntent = await this.paymentRepository.savePaymentIntent(intentDomain, tx);

      // Save inventory reservations linked to this intent
      for (const res of reservationList) {
        const invRes = new InventoryReservation({
          paymentIntentId: savedIntent.id!,
          orderId: order.id,
          ownerTenantId: res.ownerTenantId,
          locationId: res.locationId,
          productVariantId: res.productVariantId,
          quantity: res.quantity,
          status: "ACTIVE",
          expiresAt,
        });
        await this.paymentRepository.saveReservation(invRes, tx);
      }

      // 5. Invoke Provider Adapter
      const provider = PaymentProviderFactory.getProvider(input.providerType);
      const providerResult = await provider.createPaymentIntent({
        intentId: savedIntent.id!,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountMinor: targetAmount,
        currency: order.currency,
        collectorTenantId: input.collectorTenantId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        redirectUrl: input.redirectUrl,
      });

      // Update intent with provider reference & transaction ID
      savedIntent.setProviderReference(providerResult.providerReference);
      await this.paymentRepository.savePaymentIntent(savedIntent, tx);

      // Record Payment Attempt #1
      const attempt = new PaymentAttempt({
        paymentIntentId: savedIntent.id!,
        attemptNumber: 1,
        providerTransactionId: providerResult.providerTransactionId,
        paymentMethodType: input.paymentMethodType,
        status: "INITIATED",
        rawResponseSanitized: providerResult.rawResponse,
      });
      await this.paymentRepository.savePaymentAttempt(attempt, tx);

      // Create PROVIDER_PENDING Order Tender
      await tx.insert(orderTenders).values({
        orderId: order.id,
        method: input.paymentMethodType ?? "EXTERNAL_CARD",
        amountMinor: targetAmount,
        currency: order.currency,
        reference: providerResult.providerReference,
        paymentIntentId: savedIntent.id,
        verificationStatus: "PROVIDER_PENDING",
        declaredByUserId: input.actorUserId,
      });

      // 6. Audit & Outbox
      await tx.insert(auditLogs).values({
        tenantId: input.collectorTenantId,
        actorUserId: input.actorUserId,
        action: "payment.intent.created",
        entityType: "payment_intent",
        entityId: savedIntent.id,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountMinor: targetAmount.toString(),
          provider: input.providerType,
          providerReference: providerResult.providerReference,
        },
      });

      await tx.insert(outboxEvents).values({
        tenantId: input.collectorTenantId,
        aggregateId: savedIntent.id!,
        eventType: "payment.intent.created.v1",
        payload: {
          paymentIntentId: savedIntent.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountMinor: targetAmount.toString(),
          currency: order.currency,
          provider: input.providerType,
          providerReference: providerResult.providerReference,
        },
      });

      return {
        id: savedIntent.id!,
        orderId: order.id,
        orderNumber: order.orderNumber,
        collectorTenantId: savedIntent.collectorTenantId,
        provider: savedIntent.provider,
        amountMinor: targetAmount.toString(),
        currency: savedIntent.currency,
        status: savedIntent.status,
        providerReference: providerResult.providerReference,
        providerTransactionId: providerResult.providerTransactionId,
        checkoutUrl: providerResult.checkoutUrl,
        publicKey: providerResult.publicKey,
        integritySignature: providerResult.integritySignature,
        expiresAt: savedIntent.expiresAt,
      };
    });
  }
}
