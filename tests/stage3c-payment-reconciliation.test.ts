import { describe, it, expect, beforeAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
  orders,
  paymentIntents,
  paymentReconciliations,
  journalEntries,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CreatePaymentIntentUseCase } from "@/modules/payments/application/create-payment-intent.usecase";
import { ReconcilePaymentUseCase } from "@/modules/payments/application/reconcile-payment.usecase";
import { TestPaymentProvider } from "@/modules/payments/infrastructure/providers/test-payment.provider";
import { PaymentProviderFactory } from "@/modules/payments/infrastructure/providers/provider-factory";

describe("Stage 3C.1 Server-to-Server Payment Reconciliation", () => {
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
  const reconcilePaymentUseCase = new ReconcilePaymentUseCase(paymentRepo);
  const testProvider = PaymentProviderFactory.getProvider("TEST") as TestPaymentProvider;

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

  it("1. Status Mismatch Recovery: Automatically resolves approved provider status and triggers settlement posting", async () => {
    const suffix = `rec-recover-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Reconciliation Item ${suffix}`,
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
      quantity: 5,
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

    const intent = await createPaymentIntentUseCase.execute({
      orderId: order.id,
      collectorTenantId: hostTenantId,
      providerType: "TEST",
      amountMinor: 5000000n,
    });

    // Simulate provider marking the transaction APPROVED out-of-band (e.g. user paid on portal, webhook delayed)
    testProvider.simulateTransactionState(intent.providerReference!, {
      status: "APPROVED",
      transactionId: `tx-rec-${suffix}`,
      amountInCents: 5000000,
    });

    // Reconcile server-to-server
    const recOutput = await reconcilePaymentUseCase.execute({
      paymentIntentId: intent.id,
      actorUserId: hostOwnerUserId,
    });

    expect(recOutput.isResolved).toBe(true);
    expect(recOutput.reconciliationStatus).toBe("STATUS_MISMATCH");

    // Payment intent should now be SUCCEEDED
    const updatedIntent = await paymentRepo.findIntentById(intent.id);
    expect(updatedIntent?.status).toBe("SUCCEEDED");

    // Order should now be COMPLETED
    const updatedOrder = await orderRepo.findById(order.id);
    expect(updatedOrder?.status).toBe("COMPLETED");

    // Financial entry should now be POSTED
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
  });

  it("2. Clean Match: Confirms agreement when both internal and provider states match", async () => {
    const suffix = `rec-match-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Match Item ${suffix}`,
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
      amountMinor: 2000000n,
    });

    // Simulate matching pending status on provider
    testProvider.simulateTransactionState(intent.providerReference!, {
      status: "PENDING",
      amountInCents: 2000000,
    });

    // Reconcile while still pending/processing
    const recOutput = await reconcilePaymentUseCase.execute({
      paymentIntentId: intent.id,
      actorUserId: hostOwnerUserId,
    });

    expect(recOutput.reconciliationStatus).toBe("MATCHED");
    expect(recOutput.isResolved).toBe(false);
  });
});
