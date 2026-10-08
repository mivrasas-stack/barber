import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { inventoryPositions } from "@/infrastructure/database/schema/commerce";
import { auditLogs, outboxEvents } from "@/infrastructure/database/schema";

export interface ExpireReservationsResult {
  expiredCount: number;
  reservationIds: string[];
  intentsExpired: string[];
}

export class ExpireReservationsUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(asOf: Date = new Date()): Promise<ExpireReservationsResult> {
    return await db.transaction(async (tx) => {
      const expiredReservations = await this.paymentRepository.listExpiredReservations(
        asOf,
        tx
      );

      if (expiredReservations.length === 0) {
        return {
          expiredCount: 0,
          reservationIds: [],
          intentsExpired: [],
        };
      }

      const expiredIds: string[] = [];
      const intentsExpiredSet = new Set<string>();

      for (const res of expiredReservations) {
        if (res.status !== "ACTIVE") continue;

        // Lock inventory position
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

        res.markExpired();
        await this.paymentRepository.saveReservation(res, tx);
        if (res.id) expiredIds.push(res.id);

        // Update payment intent if applicable
        const intent = await this.paymentRepository.findIntentByIdForUpdate(
          res.paymentIntentId,
          tx
        );
        if (
          intent &&
          (intent.status === "PROCESSING" || intent.status === "PENDING")
        ) {
          intent.markExpired();
          await this.paymentRepository.savePaymentIntent(intent, tx);
          if (intent.id) intentsExpiredSet.add(intent.id);

          await tx.insert(auditLogs).values({
            tenantId: intent.collectorTenantId,
            action: "payment.expired",
            entityType: "payment_intent",
            entityId: intent.id,
            metadata: {
              reason: "Inventory reservation expired",
              expiredAt: new Date().toISOString(),
            },
          });

          await tx.insert(outboxEvents).values({
            tenantId: intent.collectorTenantId,
            aggregateId: intent.id!,
            eventType: "payment.expired.v1",
            payload: {
              paymentIntentId: intent.id,
              orderId: intent.orderId,
            },
          });
        }
      }

      return {
        expiredCount: expiredIds.length,
        reservationIds: expiredIds,
        intentsExpired: Array.from(intentsExpiredSet),
      };
    });
  }
}
