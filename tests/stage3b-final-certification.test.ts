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
  stockMovements,
  orders,
  orderItems,
  journalEntries,
  journalLines,
  appointments,
  appointmentServices,
  staffProfiles,
  services,
  outboxEvents,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { UpdateProductUseCase } from "@/modules/commerce/application/update-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CompleteOrderUseCase } from "@/modules/pos/application/complete-order.usecase";
import { ReturnOrderUseCase } from "@/modules/pos/application/return-order.usecase";
import { PostServiceRevenueUseCase } from "@/modules/finance/application/post-service-revenue.usecase";
import { ConflictError } from "@/shared/errors/app-error";

describe("Stage 3B Final Certification & Invariants", () => {
  const productRepo = new DrizzleProductRepository();
  const inventoryRepo = new DrizzleInventoryRepository();
  const orderRepo = new DrizzleOrderRepository();
  const financeRepo = new DrizzleFinanceRepository();
  const completeOrderUseCase = new CompleteOrderUseCase(
    orderRepo,
    inventoryRepo,
    financeRepo
  );
  const returnOrderUseCase = new ReturnOrderUseCase(
    orderRepo,
    inventoryRepo,
    financeRepo
  );

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

  it("1. Idempotency Certification: 50 identical concurrent requests -> 1 execution, 0 duplicates, replays result", async () => {
    const suffix = `idemp-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Idempotent Oil ${suffix}`,
      variants: [
        {
          sku: `IDM-${suffix}`,
          name: "50ml",
          priceMinor: 3000000n, // $30,000 COP
          costMinor: 1000000n, // $10,000 COP
        },
      ],
    });
    const variantId = product.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 10,
      unitCostMinor: 1000000n,
    });

    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 2,
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    const idempotencyKey = `key-${suffix}`;
    const payload = {
      orderId: order.id,
      tenders: [{ method: "CASH" as const, amountMinor: 6000000n }],
      actorUserId: hostOwnerUserId,
      idempotencyKey,
    };

    // 50 simultaneous parallel executions with same idempotency key and same payload
    const results = await Promise.all(
      Array.from({ length: 50 }, () => completeOrderUseCase.execute({ ...payload }))
    );

    // All 50 must resolve with status COMPLETED
    expect(results).toHaveLength(50);
    for (const r of results) {
      expect(r.id).toBe(order.id);
      expect(r.status).toBe("COMPLETED");
    }

    // Exactly 1 SALE stock movement created
    const movements = await db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.sourceType, "ORDER"),
          eq(stockMovements.sourceId, order.id)
        )
      );
    expect(movements).toHaveLength(1);
    expect(movements[0].quantity).toBe(2);

    // Stock on_hand deducted exactly once: 10 - 2 = 8
    const pos = await inventoryRepo.findPosition(hostTenantId, locationId, variantId);
    expect(pos!.onHand).toBe(8);

    // Exactly 1 Journal Entry created
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "ORDER"),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(entries).toHaveLength(1);

    // Exactly 1 outbox event for order.completed
    const outboxes = await db
      .select()
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.aggregateId, order.id),
          eq(outboxEvents.eventType, "order.completed")
        )
      );
    expect(outboxes).toHaveLength(1);

    // Negative Test: Same Idempotency-Key with DIFFERENT payload must throw ConflictError (409)
    await expect(
      completeOrderUseCase.execute({
        orderId: order.id,
        tenders: [{ method: "EXTERNAL_CARD" as const, amountMinor: 6000000n }], // Different tender method!
        actorUserId: hostOwnerUserId,
        idempotencyKey,
      })
    ).rejects.toThrow(ConflictError);
  });

  it("2. Historical Cost Snapshot Invariance: Catalog updates never mutate historical order COGS", async () => {
    const suffix = `hist-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Snapshot Cream ${suffix}`,
      variants: [
        {
          sku: `SNP-${suffix}`,
          name: "Original Cost",
          priceMinor: 4000000n, // $40,000 COP
          costMinor: 1500000n, // $15,000 COP snapshot cost
        },
      ],
    });
    const variantId = product.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 5,
      unitCostMinor: 1500000n,
    });

    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 1,
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [{ method: "CASH" as const, amountMinor: 4000000n }],
      actorUserId: hostOwnerUserId,
    });

    // Check historical snapshot on order item: unitCostMinor must be $15,000 COP
    const [savedItem] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(savedItem.unitCostMinor).toBe(1500000n);

    // Later: Catalog cost doubles to $30,000 COP in product_variants
    await db
      .update(productVariants)
      .set({ costMinor: 3000000n, priceMinor: 8000000n })
      .where(eq(productVariants.id, variantId));

    // Re-query historical order item from DB
    const [reloadedItem] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    // Must remain 15,000 COP! Never mutated by catalog updates.
    expect(reloadedItem.unitCostMinor).toBe(1500000n);

    // Check financial entry COGS line: must remain 15,000 COP
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "ORDER"),
          eq(journalEntries.sourceId, order.id)
        )
      );
    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entry.id));
    const cogsLine = lines.find((l) => l.memo?.includes("COGS"));
    expect(BigInt(cogsLine!.amountMinor)).toBe(1500000n);
  });

  it("3. Transaction Rollback Atomicity: Failure in financial core rolls back inventory and order", async () => {
    const suffix = `roll-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Rollback Gel ${suffix}`,
      variants: [
        {
          sku: `ROL-${suffix}`,
          name: "Rollback Gel",
          priceMinor: 2500000n,
          costMinor: 1000000n,
        },
      ],
    });
    const variantId = product.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 5,
      unitCostMinor: 1000000n,
    });

    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 2,
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    // Mock faulty finance repository that throws an unexpected error during createJournalEntry
    const faultyFinanceRepo: any = {
      ...financeRepo,
      getOrCreateDefaultAccounts: (...args: any[]) => financeRepo.getOrCreateDefaultAccounts(args[0], args[1], args[2]),
      postJournalEntry: async () => {
        throw new Error("SIMULATED_FINANCIAL_CORE_CRASH");
      },
    };

    const faultyCompleteUseCase = new CompleteOrderUseCase(
      orderRepo,
      inventoryRepo,
      faultyFinanceRepo
    );

    // Expect checkout to fail
    await expect(
      faultyCompleteUseCase.execute({
        orderId: order.id,
        tenders: [{ method: "CASH" as const, amountMinor: 5000000n }],
        actorUserId: hostOwnerUserId,
      })
    ).rejects.toThrow("SIMULATED_FINANCIAL_CORE_CRASH");

    // Order must remain OPEN/DRAFT, not COMPLETED
    const [persistedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    expect(persistedOrder.status).not.toBe("COMPLETED");

    // Inventory must remain exactly 5 on_hand (no stock deducted)
    const pos = await inventoryRepo.findPosition(hostTenantId, locationId, variantId);
    expect(pos!.onHand).toBe(5);

    // Zero SALE movements created for this order
    const movements = await db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.sourceType, "ORDER"),
          eq(stockMovements.sourceId, order.id)
        )
      );
    expect(movements).toHaveLength(0);

    // Zero journal entries created
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "ORDER"),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(entries).toHaveLength(0);
  });

  it("4. Order Return & Refund: Restores stock with SALE_RETURN and reverses financial entries", async () => {
    const suffix = `ret-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Returnable Tonic ${suffix}`,
      variants: [
        {
          sku: `RET-${suffix}`,
          name: "Returnable Tonic",
          priceMinor: 5000000n, // $50,000 COP
          costMinor: 2000000n, // $20,000 COP
        },
      ],
    });
    const variantId = product.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 10,
      unitCostMinor: 2000000n,
    });

    // 1. Sell 2 units
    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 2,
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [{ method: "CASH" as const, amountMinor: 10000000n }],
      actorUserId: hostOwnerUserId,
    });

    // Stock on_hand after sale: 10 - 2 = 8
    let pos = await inventoryRepo.findPosition(hostTenantId, locationId, variantId);
    expect(pos!.onHand).toBe(8);

    // 2. Execute ReturnOrderUseCase
    const returned = await returnOrderUseCase.execute({
      orderId: order.id,
      reason: "Customer changed mind, product unopened",
      actorUserId: hostOwnerUserId,
    });

    expect(returned.status).toBe("REFUNDED");

    // Stock on_hand after return must be restored: 8 + 2 = 10
    pos = await inventoryRepo.findPosition(hostTenantId, locationId, variantId);
    expect(pos!.onHand).toBe(10);

    // SALE_RETURN movement created
    const returnMovements = await db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.sourceId, order.id),
          eq(stockMovements.movementType, "SALE_RETURN")
        )
      );
    expect(returnMovements).toHaveLength(1);
    expect(returnMovements[0].quantity).toBe(2);

    // Reversal journal entry created
    const refundEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceId, order.id),
          eq(journalEntries.entryType, "REVERSAL")
        )
      );
    expect(refundEntries).toHaveLength(1);

    const refLines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, refundEntries[0].id));

    // Reversal debits and credits must balance
    let d = 0n;
    let c = 0n;
    for (const l of refLines) {
      if (l.direction === "DEBIT") d += BigInt(l.amountMinor);
      if (l.direction === "CREDIT") c += BigInt(l.amountMinor);
    }
    expect(d).toBe(c);
  });

  it("5. Anti-Double-Financialization: PostServiceRevenueUseCase is rejected if appointment completed via POS", async () => {
    const [staff] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.tenantId, hostTenantId))
      .limit(1);
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.tenantId, hostTenantId))
      .limit(1);

    const futureTime = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 10000000));
    const [appointment] = await db
      .insert(appointments)
      .values({
        tenantId: hostTenantId,
        locationId,
        customerNameSnapshot: "Anti-Double Test",
        staffId: staff.id,
        status: "CONFIRMED",
        startsAt: futureTime,
        endsAt: new Date(futureTime.getTime() + 45 * 60 * 1000),
      })
      .returning();

    await db.insert(appointmentServices).values({
      appointmentId: appointment.id,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      priceMinor: Number(service.priceMinor),
      currency: "COP",
      durationMinutes: 45,
    });

    // Complete appointment via POS Order
    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      appointmentId: appointment.id,
      items: [
        {
          itemType: "SERVICE",
          serviceId: service.id,
          description: service.name,
          quantity: 1,
          unitPriceMinor: BigInt(service.priceMinor),
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [{ method: "CASH" as const, amountMinor: BigInt(service.priceMinor) }],
      actorUserId: hostOwnerUserId,
    });

    // Subsequent attempt to financialize appointment directly via PostServiceRevenueUseCase must fail
    const postServiceRevenue = new PostServiceRevenueUseCase(financeRepo);
    await expect(
      postServiceRevenue.execute({
        appointmentId: appointment.id,
        actorUserId: hostOwnerUserId,
      })
    ).rejects.toThrow(ConflictError);
  });
});
