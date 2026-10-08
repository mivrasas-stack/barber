import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { IPaymentRepository } from "../domain/payment.repository.interface";
import { PaymentIntent } from "../domain/payment-intent";
import { PaymentAttempt } from "../domain/payment-attempt";
import { Refund } from "../domain/refund";
import { InventoryReservation } from "../domain/inventory-reservation";
import { PaymentNotFoundError } from "../domain/payment-errors";
import { orders } from "@/infrastructure/database/schema/commerce";

export interface PaymentDetailsResult {
  intent: PaymentIntent;
  orderNumber?: string;
  attempts: PaymentAttempt[];
  refunds: Refund[];
  reservations: InventoryReservation[];
}

export class GetPaymentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(
    paymentIntentId: string,
    tenantId: string
  ): Promise<PaymentDetailsResult> {
    const intent = await this.paymentRepository.findIntentById(paymentIntentId);
    if (!intent) {
      throw new PaymentNotFoundError(paymentIntentId);
    }

    if (intent.collectorTenantId !== tenantId) {
      throw new PaymentNotFoundError(paymentIntentId);
    }

    const [order] = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.id, intent.orderId))
      .limit(1);

    const attempts = await this.paymentRepository.listAttemptsByIntentId(
      paymentIntentId
    );
    const refunds = await this.paymentRepository.listRefundsByPaymentId(
      paymentIntentId
    );
    const reservations = await this.paymentRepository.listReservationsByPaymentIntent(
      paymentIntentId
    );

    return {
      intent,
      orderNumber: order?.orderNumber,
      attempts,
      refunds,
      reservations,
    };
  }
}
