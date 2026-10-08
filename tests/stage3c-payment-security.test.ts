import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CreatePaymentIntentUseCase } from "@/modules/payments/application/create-payment-intent.usecase";
import { GetPaymentUseCase } from "@/modules/payments/application/get-payment.usecase";
import { CancelPaymentIntentUseCase } from "@/modules/payments/application/cancel-payment-intent.usecase";
import { PaymentNotFoundError } from "@/modules/payments/domain/payment-errors";

describe("Stage 3C.1 Payment Security, Multi-Tenant Shielding & RBAC", () => {
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
  const getPaymentUseCase = new GetPaymentUseCase(paymentRepo);
  const cancelPaymentIntentUseCase = new CancelPaymentIntentUseCase(paymentRepo);

  let hostTenantId: string;
  let otherTenantId: string;
  let hostLocationId: string;
  let hostOwnerUserId: string;

  beforeAll(async () => {
    // 1. Primary Tenant
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
    hostLocationId = loc.id;
    hostOwnerUserId = hostOwner.id;

    // 2. Second Distinct Tenant for Cross-Tenant Testing
    const otherSlug = `isolated-tenant-${Date.now()}`;
    const [other] = await db
      .insert(tenants)
      .values({
        slug: otherSlug,
        name: "Isolated Rival Barber",
        status: "ACTIVE",
        defaultCurrency: "COP",
      })
      .returning();
    otherTenantId = other.id;
  });

  it("1. Cross-Tenant Intent Shielding: Tenant B cannot fetch Tenant A's payment intent", async () => {
    const suffix = `sec-read-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Secure Item ${suffix}`,
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
      locationId: hostLocationId,
      productVariantId: product.variants[0].id!,
      quantity: 2,
      unitCostMinor: 1000000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId: hostLocationId,
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

    // Tenant B attempts to read Tenant A's intent -> PaymentNotFoundError
    await expect(
      getPaymentUseCase.execute(intent.id, otherTenantId)
    ).rejects.toThrow(PaymentNotFoundError);

    // Tenant A reading own intent succeeds
    const accessOk = await getPaymentUseCase.execute(intent.id, hostTenantId);
    expect(accessOk.intent.id).toBe(intent.id);
  });

  it("2. Cross-Tenant Cancellation Shielding: Tenant B cannot cancel Tenant A's payment intent", async () => {
    const suffix = `sec-cancel-${Date.now()}`;
    const product = await createProductUseCase.execute({
      ownerTenantId: hostTenantId,
      name: `Cancel Shield Item ${suffix}`,
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
      locationId: hostLocationId,
      productVariantId: product.variants[0].id!,
      quantity: 2,
      unitCostMinor: 1500000n,
      actorUserId: hostOwnerUserId,
    });

    const order = await createDraftOrderUseCase.execute({
      contextTenantId: hostTenantId,
      locationId: hostLocationId,
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
      amountMinor: 3000000n,
    });

    // Tenant B attempts to cancel Tenant A's intent
    await expect(
      cancelPaymentIntentUseCase.execute(intent.id, otherTenantId)
    ).rejects.toThrow(PaymentNotFoundError);

    // Verify intent status is still PENDING/ACTIVE
    const refreshed = await paymentRepo.findIntentById(intent.id);
    expect(refreshed?.status).toBe("PENDING");
  });
});
