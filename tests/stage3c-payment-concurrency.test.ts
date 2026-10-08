import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
  products,
  inventoryPositions,
  orders,
  refunds,
  journalEntries,
  journalLines,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CreatePaymentIntentUseCase } from "@/modules/payments/application/create-payment-intent.usecase";
import { ProcessWebhookUseCase } from "@/modules/payments/application/process-webhook.usecase";
import { RequestRefundUseCase } from "@/modules/payments/application/request-refund.usecase";
import { TestPaymentProvider } from "@/modules/payments/infrastructure/providers/test-payment.provider";

describe("Stage 3C.1 High Concurrency: Stock Contention & Refund Limits", () => {
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
  const processWebhookUseCase = new ProcessWebhookUseCase(paymentRepo);
  const requestRefundUseCase = new RequestRefundUseCase(paymentRepo);
  const testProvider = new TestPaymentProvider();

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

  it("1. 50 Concurrent Checkouts Competing for Scarce Stock: Never oversells or corrupts reserved count", async () => {
    const suffix = `stock-race-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Limited Edition Blade ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 10000000n, // 100.000 COP
          costMinor: 5000000n,
        },
      ],
    });

    // Only 5 units in stock
    const INITIAL_STOCK = 5;
    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: INITIAL_STOCK,
      unitCostMinor: 5000000n,
      actorUserId: hostOwnerUserId,
    });

    // Create 50 distinct draft orders, each requesting 1 unit
    const draftOrders = await Promise.all(
      Array.from({ length: 50 }).map(() =>
        createDraftOrderUseCase.execute({
          contextTenantId: hostTenantId,
          locationId,
          items: [
            {
              itemType: "PRODUCT",
              productVariantId: product.variants[0].id!,
              quantity: 1,
            },
          ],
        })
      )
    );

    // Concurrently attempt to create payment intents (which reserve stock)
    const results = await Promise.all(
      draftOrders.map((o) =>
        createPaymentIntentUseCase
          .execute({
            orderId: o.id,
            collectorTenantId: hostTenantId,
            providerType: "TEST",
            amountMinor: 10000000n,
          })
          .then((res) => ({ success: true, id: res.id }))
          .catch((err) => ({ success: false, error: err.message }))
      )
    );

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Exactly 5 must succeed, 45 must fail with insufficient stock
    expect(succeeded.length).toBe(INITIAL_STOCK);
    expect(failed.length).toBe(45);

    // Verify inventory position state
    const [pos] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );

    expect(pos.onHand).toBe(INITIAL_STOCK);
    expect(pos.reserved).toBe(INITIAL_STOCK); // Exactly 5, never > 5
  });

  it("2. 50 Concurrent Partial Refunds: Exactly exhausts captured balance without over-refunding", async () => {
    const suffix = `refund-race-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Refundable Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 10000000n, // 100.000 COP
          costMinor: 4000000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 1,
      unitCostMinor: 4000000n,
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
      amountMinor: 10000000n, // 100.000 COP
    });

    // Approve payment via webhook
    const { rawBody, headers } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-ref-${suffix}`,
      status: "APPROVED",
      amountInCents: 10000000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });

    // Attempt 50 concurrent partial refunds of 10.000 COP (1.000.000 minor)
    // Exactly 10 should succeed (10 * 10.000 COP = 100.000 COP)
    const refundResults = await Promise.all(
      Array.from({ length: 50 }).map((_, idx) =>
        requestRefundUseCase
          .execute({
            paymentIntentId: intent.id,
            amountMinor: 1000000n,
            reason: `Partial refund attempt #${idx}`,
            actorUserId: hostOwnerUserId,
          })
          .then((res) => ({ success: true, id: res.id }))
          .catch((err) => ({ success: false, error: err.message }))
      )
    );

    const successfulRefunds = refundResults.filter((r) => r.success);
    const failedRefunds = refundResults.filter((r) => !r.success);

    expect(successfulRefunds.length).toBe(10);
    expect(failedRefunds.length).toBe(40);

    // Invariant: Total refunded amount in DB equals captured amount (100.000 COP)
    const allRefunds = await db
      .select()
      .from(refunds)
      .where(eq(refunds.paymentIntentId, intent.id));

    let totalRefunded = 0n;
    for (const r of allRefunds) {
      if (r.status === "SUCCEEDED") {
        totalRefunded += BigInt(r.amountMinor);
      }
    }
    expect(totalRefunded).toBe(10000000n);

    // Verify all refund journals satisfy DEBIT == CREDIT
    const refundJournals = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.entryType, "PAYMENT_REFUND"));

    for (const rj of refundJournals) {
      const lines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, rj.id));

      let d = 0n;
      let c = 0n;
      for (const l of lines) {
        if (l.direction === "DEBIT") d += BigInt(l.amountMinor);
        if (l.direction === "CREDIT") c += BigInt(l.amountMinor);
      }
      expect(d).toBe(c);
    }
  });
});
