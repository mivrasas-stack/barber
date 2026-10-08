import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
  products,
  inventoryPositions,
  stockMovements,
  orders,
  orderTenders,
  journalEntries,
  journalLines,
  paymentIntents,
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
import { TestPaymentProvider } from "@/modules/payments/infrastructure/providers/test-payment.provider";
import { PaymentSignatureInvalidError } from "@/modules/payments/domain/payment-errors";

describe("Stage 3C.1 Webhook Authority, Replay Protection & Concurrency", () => {
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

  it("1. Valid Signed Webhook: Settles payment, updates order to COMPLETED, converts reservation to SALE movement, and posts ledger entries", async () => {
    const suffix = `wh-ok-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Webhook Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 3000000n, // 30.000 COP
          costMinor: 1500000n, // 15.000 COP cost
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 10,
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
          quantity: 2,
        },
      ],
    });

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 6000000n,
    });

    // Generate valid signed webhook payload
    const { rawBody, headers } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-${suffix}`,
      status: "APPROVED",
      amountInCents: 6000000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    // Process webhook
    const result = await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });

    expect(result.status).toBe("PROCESSED");
    expect(result.paymentIntentId).toBe(intent.id);

    // Verify Payment Intent status is SUCCEEDED
    const updatedIntent = await paymentRepo.findIntentById(intent.id);
    expect(updatedIntent?.status).toBe("SUCCEEDED");

    // Verify Order is COMPLETED
    const updatedOrder = await orderRepo.findById(order.id);
    expect(updatedOrder?.status).toBe("COMPLETED");

    // Verify Stock Movement was created (SALE)
    const movements = await db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.productVariantId, product.variants[0].id!),
          eq(stockMovements.sourceId, intent.id)
        )
      );
    expect(movements.length).toBe(1);
    expect(movements[0].movementType).toBe("SALE");
    expect(movements[0].quantity).toBe(2);

    // Verify Inventory Position
    const [pos] = await db
      .select()
      .from(inventoryPositions)
      .where(
        and(
          eq(inventoryPositions.productVariantId, product.variants[0].id!),
          eq(inventoryPositions.locationId, locationId)
        )
      );
    expect(pos.onHand).toBe(8); // 10 - 2
    expect(pos.reserved).toBe(0); // Reservation converted

    // Verify Financial Ledger Entries
    const journals = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "PAYMENT"),
          eq(journalEntries.sourceId, intent.id)
        )
      );
    expect(journals.length).toBe(1);
    expect(journals[0].status).toBe("POSTED");

    // Invariant: DEBITS == CREDITS
    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, journals[0].id));

    let sumDebits = 0n;
    let sumCredits = 0n;
    for (const l of lines) {
      if (l.direction === "DEBIT") sumDebits += BigInt(l.amountMinor);
      if (l.direction === "CREDIT") sumCredits += BigInt(l.amountMinor);
    }
    expect(sumDebits).toBe(sumCredits);
  });

  it("2. Signature Rejection: Invalid signature is rejected with PaymentSignatureInvalidError and produces 0 state changes", async () => {
    const suffix = `wh-bad-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Signature Test ${suffix}`,
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
      quantity: 5,
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
      amountMinor: 2000000n,
    });

    const { rawBody } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-${suffix}`,
      status: "APPROVED",
      amountInCents: 2000000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    // Provide invalid signature header
    const badHeaders = {
      "x-test-signature": "invalid_forged_signature_hash_12345",
      "x-test-timestamp": Math.floor(Date.now() / 1000).toString(),
    };

    await expect(
      processWebhookUseCase.execute({
        providerType: "TEST",
        rawBody,
        headers: badHeaders,
      })
    ).rejects.toThrow(PaymentSignatureInvalidError);

    // Verify state was completely untouched
    const freshIntent = await paymentRepo.findIntentById(intent.id);
    expect(freshIntent?.status).toBe("PENDING");

    const freshOrder = await orderRepo.findById(order.id);
    expect(freshOrder?.status).toBe("DRAFT");
  });

  it("3. Replay Protection: Second identical webhook is recognized as IGNORED_DUPLICATE with zero side-effects", async () => {
    const suffix = `replay-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Replay Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 1000000n,
          costMinor: 500000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 3,
      unitCostMinor: 500000n,
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
      amountMinor: 1000000n,
    });

    const { rawBody, headers } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-${suffix}`,
      status: "APPROVED",
      amountInCents: 1000000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    // 1st Delivery
    const firstResult = await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });
    expect(firstResult.status).toBe("PROCESSED");

    // 2nd Delivery (exact duplicate)
    const secondResult = await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });
    expect(secondResult.status).toBe("IGNORED_DUPLICATE");

    // Verify only 1 journal entry exists
    const journals = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "PAYMENT"),
          eq(journalEntries.sourceId, intent.id)
        )
      );
    expect(journals.length).toBe(1);
  });

  it("4. Concurrency: 50 concurrent webhooks for same event -> exactly 1 succeeds in posting, 49 duplicate, 0 corruption", async () => {
    const suffix = `race-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Race Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 1500000n,
          costMinor: 800000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 5,
      unitCostMinor: 800000n,
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
      amountMinor: 1500000n,
    });

    const { rawBody, headers } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-${suffix}`,
      status: "APPROVED",
      amountInCents: 1500000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    // Execute 50 concurrent deliveries of the identical webhook
    const promises = Array.from({ length: 50 }).map(() =>
      processWebhookUseCase
        .execute({
          providerType: "TEST",
          rawBody,
          headers,
        })
        .catch((err) => ({ status: "FAILED", error: err.message } as any))
    );

    const outcomes = await Promise.all(promises);

    const processedCount = outcomes.filter((o) => o.status === "PROCESSED").length;
    const ignoredCount = outcomes.filter((o) => o.status === "IGNORED_DUPLICATE").length;

    // Exactly 1 must have processed, the remaining 49 must be recognized as duplicate
    expect(processedCount).toBe(1);
    expect(ignoredCount).toBe(49);

    // Double-check total financial entries
    const journals = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "PAYMENT"),
          eq(journalEntries.sourceId, intent.id)
        )
      );
    expect(journals.length).toBe(1);
  });

  it("5. Webhook Decline: Releases inventory reservations and updates intent to FAILED", async () => {
    const suffix = `decl-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Decline Item ${suffix}`,
      variants: [
        {
          name: "Standard",
          sku: `SKU-${suffix}`,
          priceMinor: 2200000n,
          costMinor: 1000000n,
        },
      ],
    });

    await receiveStockUseCase.execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: product.variants[0].id!,
      quantity: 10,
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
          quantity: 3,
        },
      ],
    });

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 6600000n,
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

    // Deliver DECLINED webhook
    const { rawBody, headers } = testProvider.generateMockWebhook({
      reference: intent.providerReference!,
      transactionId: `tx-decl-${suffix}`,
      status: "DECLINED",
      amountInCents: 6600000,
      currency: "COP",
      paymentMethodType: "CARD",
    });

    await processWebhookUseCase.execute({
      providerType: "TEST",
      rawBody,
      headers,
    });

    // Intent should be marked FAILED
    const updatedIntent = await paymentRepo.findIntentById(intent.id);
    expect(updatedIntent?.status).toBe("FAILED");

    // Reserved stock must be released back to 0
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
    expect(pos.onHand).toBe(10); // Untouched
  });
});
