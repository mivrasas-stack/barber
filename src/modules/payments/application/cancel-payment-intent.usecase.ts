import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import {
  PaymentNotFoundError,
  PaymentAlreadySucceededError,
} from "../domain/payment-errors";
import { inventoryPositions } from "@/infrastructure/database/schema/commerce";
import { auditLogs, outboxEvents } from "@/infrastructure/database/schema";

export class CancelPaymentIntentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(paymentIntentId: string, tenantId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const intent = await this.paymentRepository.findIntentByIdForUpdate(
        paymentIntentId,
        tx
      );
      if (!intent) {
        throw new PaymentNotFoundError(paymentIntentId);
      }

      if (intent.collectorTenantId !== tenantId) {
        throw new PaymentNotFoundError(paymentIntentId);
      }

      if (intent.status === "SUCCEEDED") {
        throw new PaymentAlreadySucceededError(paymentIntentId);
      }

      if (intent.status === "CANCELLED") {
        return; // Idempotent
      }

      intent.markCanceled();
      await this.paymentRepository.savePaymentIntent(intent, tx);

      // Release inventory reservations
      const reservations = await this.paymentRepository.listReservationsByPaymentIntent(
        intent.id!,
        tx
      );

      for (const res of reservations) {
        if (res.status === "ACTIVE") {
          const [position] = await tx
            .select()
            .from(inventoryPositions)
            .where(
              and(
                eq(inventoryPositions.productVariantId, res.productVariantId),
                eq(inventoryPositions.locationId, res.locationId),
                eq(inventoryPositions.ownerTenantId, res.ownerTenantId)
              )
            )
            .for("update")
            .limit(1);

          if (position) {
            await tx
              .update(inventoryPositions)
              .set({
                reserved: Math.max(0, position.reserved - res.quantity),
                updatedAt: new Date(),
              })
              .where(eq(inventoryPositions.id, position.id));
          }

          res.markReleased();
          await this.paymentRepository.saveReservation(res, tx);
        }
      }

      await tx.insert(auditLogs).values({
        tenantId: intent.collectorTenantId,
        action: "payment.canceled",
        entityType: "payment_intent",
        entityId: intent.id,
      });

      await tx.insert(outboxEvents).values({
        tenantId: intent.collectorTenantId,
        aggregateId: intent.id!,
        eventType: "payment.canceled.v1",
        payload: {
          paymentIntentId: intent.id,
          orderId: intent.orderId,
        },
      });
    });
  }
}
