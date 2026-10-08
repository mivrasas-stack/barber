import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
  products,
  productVariants,
  inventoryPositions,
  orders,
  orderItems,
  orderTenders,
  paymentIntents,
  inventoryReservations,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CreatePaymentIntentUseCase } from "@/modules/payments/application/create-payment-intent.usecase";
import { CancelPaymentIntentUseCase } from "@/modules/payments/application/cancel-payment-intent.usecase";
import { ExpireReservationsUseCase } from "@/modules/payments/application/expire-reservations.usecase";
import { GetPaymentUseCase } from "@/modules/payments/application/get-payment.usecase";
import { PaymentAmountExceedsOrderBalanceError } from "@/modules/payments/domain/payment-errors";

describe("Stage 3C.1 Payments Core & Inventory Reservations", () => {
  const productRepo = new DrizzleProductRepository();
  const inventoryRepo = new DrizzleInventoryRepository();
  const orderRepo = new DrizzleOrderRepository();
  const paymentRepo = new DrizzlePaymentRepository();

  const createProductUseCase = new CreateProductUseCase(productRepo);
  const receiveStockUseCase = new ReceiveStockUseCase(inventoryRepo);
  const createDraftOrderUseCase = new CreateDraftOrderUseCase(
    orderRepo,
    productRepo
  );
  const createPaymentIntentUseCase = new CreatePaymentIntentUseCase(paymentRepo);
  const cancelPaymentIntentUseCase = new CancelPaymentIntentUseCase(paymentRepo);
  const expireReservationsUseCase = new ExpireReservationsUseCase(paymentRepo);
  const getPaymentUseCase = new GetPaymentUseCase(paymentRepo);

  let hostTenantId: string;
  let locationId: string;
  let hostOwnerUserId: string;

  beforeAll(async () => {
    const [host] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "the-royal-barber"))
      .limit(1);
    const [loc] = await db
      .select()
      .from(locations)
      .where(eq(locations.tenantId, host.id))
      .limit(1);
    const [hostOwner] = await db
      .select()
      .from(users)
      .where(eq(users.emailNormalized, "owner@royalbarber.dev"))
      .limit(1);

    hostTenantId = host.id;
    locationId = loc.id;
    hostOwnerUserId = hostOwner.id;
  });

  it("1. Server Amount Authority: Rejects intent amount exceeding unpaid order balance", async () => {
    const suffix = `auth-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Test Product ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 5000000n, // 50.000 COP
          costMinor: 2500000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 10,
      unitCostMinor: 2500000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: product.variants[0].id!,
          quantity: 1,
        },
      ],
    });

    // Attempt to create intent for 60.000 COP (order is only 50.000 COP)
    await expect(
      createPaymentIntentUseCase.execute({
        orderId: order.id,
        collectorTenantId: hostTenantId,
        providerType: "TEST",
        amountMinor: 6000000n,
      })
    ).rejects.toThrow(PaymentAmountExceedsOrderBalanceError);
  });

  it("2. Idempotency Key Handling: Replays existing intent without duplicating reservations or records", async () => {
    const suffix = `idemp-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Idempotency Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 4000000n, // 40.000 COP
          costMinor: 2000000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 10,
      unitCostMinor: 2000000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: product.variants[0].id!,
          quantity: 2,
        },
      ],
    });

    const idempotencyKey = `idem-key-${suffix}`;

    // First Call
    const intent1 = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 8000000n,
      idempotencyKey,
    });

    // Check inventory position reservation
    const [pos1] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos1.reserved).toBe(2);
    expect(pos1.onHand).toBe(10);

    // Second Call with same idempotencyKey
    const intent2 = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 8000000n,
      idempotencyKey,
    });

    expect(intent2.id).toBe(intent1.id);
    expect(intent2.providerReference).toBe(intent1.providerReference);

    // Verify reservation was NOT duplicated
    const [pos2] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos2.reserved).toBe(2); // Still 2, not 4!
  });

  it("3. Cancellation & Stock Release: Canceling intent releases reserved stock immediately", async () => {
    const suffix = `cancel-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Cancel Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 3000000n,
          costMinor: 1500000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 5,
      unitCostMinor: 1500000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: product.variants[0].id!,
          quantity: 3,
        },
      ],
    });

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 9000000n,
    });

    let [pos] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos.reserved).toBe(3);

    // Cancel Intent
    await cancelPaymentIntentUseCase.execute(intent.id, hostTenantId);

    // Verify intent status is CANCELLED
    const updatedIntent = await paymentRepo.findIntentById(intent.id);
    expect(updatedIntent?.status).toBe("CANCELLED");

    // Verify position reserved is released back to 0
    [pos] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos.reserved).toBe(0);
    expect(pos.onHand).toBe(5);
  });

  it("4. Expire Reservations: Automatically releases inventory for past-due reservations", async () => {
    const suffix = `expire-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Expire Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 2000000n,
          costMinor: 1000000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 4,
      unitCostMinor: 1000000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: product.variants[0].id!,
          quantity: 2,
        },
      ],
    });

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 4000000n,
    });

    // Manually push reservation expiresAt into the past for test simulation
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    await db
      .update(inventoryReservations)
      .set({ expiresAt: pastDate })
      .where(eq(inventoryReservations.paymentIntentId, intent.id));

    // Run expiration
    const result = await expireReservationsUseCase.execute(new Date());
    expect(result.expiredCount).toBeGreaterThanOrEqual(1);
    expect(result.intentsExpired).toContain(intent.id);

    // Verify reserved position is 0
    const [pos] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos.reserved).toBe(0);

    // Verify payment intent is marked EXPIRED
    const refreshed = await paymentRepo.findIntentById(intent.id);
    expect(refreshed?.status).toBe("EXPIRED");
  });

  it("5. Get Payment Details: Accurately retrieves full details including attempts and order relation", async () => {
    const suffix = `details-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Details Product ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 2500000n,
          costMinor: 1000000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 2,
      unitCostMinor: 1000000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: product.variants[0].id!,
          quantity: 1,
        },
      ],
    });

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 2500000n,
    });

    const details = await getPaymentUseCase.execute(intent.id, hostTenantId);
    expect(details.intent.id).toBe(intent.id);
    expect(details.orderNumber).toBe(order.orderNumber);
    expect(details.attempts.length).toBeGreaterThanOrEqual(1);
    expect(details.reservations.length).toBe(1);
    expect(details.reservations[0].quantity).toBe(1);
  });
});
