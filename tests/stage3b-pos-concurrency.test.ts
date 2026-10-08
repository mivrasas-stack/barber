import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  tenants,
  locations,
  users,
  roles,
  memberships,
  membershipRoles,
  products,
  productVariants,
  inventoryPositions,
  stockMovements,
  orders,
  orderItems,
  orderTenders,
  journalEntries,
  journalLines,
  appointments,
  appointmentServices,
  staffProfiles,
  services,
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CompleteOrderUseCase } from "@/modules/pos/application/complete-order.usecase";
import { InsufficientStockError } from "@/modules/inventory/domain/inventory-errors";
import { ConflictError } from "@/shared/errors/app-error";

describe("Stage 3B POS Transactional Integrity & Concurrency Controls", () => {
  const productRepo = new DrizzleProductRepository();
  const inventoryRepo = new DrizzleInventoryRepository();
  const orderRepo = new DrizzleOrderRepository();
  const financeRepo = new DrizzleFinanceRepository();
  const completeOrderUseCase = new CompleteOrderUseCase(
    orderRepo,
    inventoryRepo,
    financeRepo
  );

  let hostTenantId: string;
  let soloTenantId: string;
  let locationId: string;
  let hostOwnerUserId: string;
  let soloUserId: string;

  beforeAll(async () => {
    const [host] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "the-royal-barber"))
      .limit(1);
    const [solo] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "carlos-barber-studio"))
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
    const [soloUser] = await db
      .select()
      .from(users)
      .where(eq(users.emailNormalized, "carlos.independent@royalbarber.dev"))
      .limit(1);

    hostTenantId = host.id;
    soloTenantId = solo.id;
    locationId = loc.id;
    hostOwnerUserId = hostOwner.id;
    soloUserId = soloUser.id;
  });

  it("50 concurrent checkouts competing for the last unit (stock = 1) -> exactly 1 succeeds, 49 fail, 0 negative stock", async () => {
    const suffix = `race-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Limited Edition Pomade ${suffix}`,
      variants: [
        {
          sku: `LTD-${suffix}`,
          name: "100g Jar",
          priceMinor: 5000000n, // $50,000 COP
          costMinor: 2500000n, // $25,000 COP
        },
      ],
    });

    const variantId = product.variants[0].id;

    // Receive exactly 1 unit
    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 1,
      unitCostMinor: 2500000n,
      actorUserId: hostOwnerUserId,
      reason: "Initial single unit stock for race test",
    });

    // Create 50 distinct draft orders competing for this single unit
    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const draftOrders = await Promise.all(
      Array.from({ length: 50 }).map((_, i) =>
        createDraft.execute({
          contextTenantId: hostTenantId,
          locationId,
          customerNameSnapshot: `Buyer ${i}`,
          items: [
            {
              itemType: "PRODUCT",
              productVariantId: variantId,
              quantity: 1,
            },
          ],
          createdByUserId: hostOwnerUserId,
        })
      )
    );

    expect(draftOrders).toHaveLength(50);

    // Launch 50 concurrent checkouts simultaneously
    const results = await Promise.allSettled(
      draftOrders.map((order) =>
        completeOrderUseCase.execute({
          orderId: order.id,
          tenders: [
            {
              method: "CASH",
              amountMinor: 5000000n,
              amountReceivedMinor: 5000000n,
            },
          ],
          actorUserId: hostOwnerUserId,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(49);

    for (const fail of failed) {
      const reason = (fail as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(InsufficientStockError);
      expect(reason.message).toMatch(/Insufficient stock/);
    }

    // Verify inventory position: MUST be exactly 0, NEVER negative
    const position = await inventoryRepo.findPosition(
      hostTenantId,
      locationId,
      variantId
    );
    expect(position).toBeDefined();
    expect(position!.onHand).toBe(0);
    expect(position!.reserved).toBe(0);

    // Verify stock movements: exactly 1 PURCHASE_RECEIPT (+1) and exactly 1 SALE (-1)
    const movements = await inventoryRepo.findMovements(hostTenantId, {
      locationId,
      productVariantId: variantId,
    });
    expect(movements).toHaveLength(2);
    const saleMovement = movements.find((m) => m.movementType === "SALE");
    const receiptMovement = movements.find(
      (m) => m.movementType === "PURCHASE_RECEIPT"
    );
    expect(saleMovement).toBeDefined();
    expect(receiptMovement).toBeDefined();
    expect(saleMovement!.quantity).toBe(1);
  });

  it("50 concurrent checkout attempts on the exact same order -> exactly 1 completes, no duplicate stock/financial effect", async () => {
    const suffix = `idemp-race-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Same Order Product ${suffix}`,
      variants: [
        {
          sku: `SAME-${suffix}`,
          name: "Standard",
          priceMinor: 4000000n,
          costMinor: 2000000n,
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
      actorUserId: hostOwnerUserId,
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

    // 50 concurrent checkouts for this same order
    const results = await Promise.allSettled(
      Array.from({ length: 50 }).map(() =>
        completeOrderUseCase.execute({
          orderId: order.id,
          tenders: [
            {
              method: "CASH",
              amountMinor: 8000000n,
              amountReceivedMinor: 8000000n,
            },
          ],
          actorUserId: hostOwnerUserId,
        })
      )
    );

    // All should settle cleanly (either returning the completed order or throwing conflict)
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    // Final position must be reduced by EXACTLY 2 (from 10 to 8), NEVER over-deducted
    const position = await inventoryRepo.findPosition(
      hostTenantId,
      locationId,
      variantId
    );
    expect(position!.onHand).toBe(8);

    // Stock movements for this order must be EXACTLY 1 SALE
    const movements = await inventoryRepo.findMovements(hostTenantId, {
      locationId,
      productVariantId: variantId,
    });
    const saleMovements = movements.filter((m) => m.sourceId === order.id);
    expect(saleMovements).toHaveLength(1);
    expect(saleMovements[0].quantity).toBe(2);

    // Financial journal entries for this order must be EXACTLY 1
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
  });

  it("Multi-seller order checkout correctly segregates revenue, COGS, and claims between Host and Solo Professional", async () => {
    const suffix = `multi-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);

    // Host product
    const hostProduct = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Host Hair Clay ${suffix}`,
      variants: [
        {
          sku: `HOST-CLAY-${suffix}`,
          name: "Clay 50g",
          priceMinor: 3000000n, // $30,000 COP
          costMinor: 1200000n, // $12,000 COP
        },
      ],
    });
    const hostVariantId = hostProduct.variants[0].id;

    // Solo Professional product
    const soloProduct = await createProduct.execute({
      ownerTenantId: soloTenantId,
      name: `Carlos Beard Balm ${suffix}`,
      variants: [
        {
          sku: `SOLO-BALM-${suffix}`,
          name: "Balm 60ml",
          priceMinor: 4000000n, // $40,000 COP
          costMinor: 1600000n, // $16,000 COP
        },
      ],
    });
    const soloVariantId = soloProduct.variants[0].id;

    // Stock each
    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: hostVariantId,
      quantity: 5,
      unitCostMinor: 1200000n,
    });
    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: soloTenantId,
      locationId,
      productVariantId: soloVariantId,
      quantity: 5,
      unitCostMinor: 1600000n,
    });

    // Create order with:
    // 1. Host product ($30,000)
    // 2. Solo Professional product ($40,000)
    // 3. Tip to Carlos ($5,000)
    // Total Grand: $75,000 COP
    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      customerNameSnapshot: "VIP Customer",
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: hostVariantId,
          quantity: 1,
        },
        {
          itemType: "PRODUCT",
          productVariantId: soloVariantId,
          quantity: 1,
        },
        {
          itemType: "TIP",
          sellerTenantId: soloTenantId,
          description: "Tip to Barber",
          quantity: 1,
          unitPriceMinor: 500000n,
        },
      ],
      createdByUserId: hostOwnerUserId,
    });

    expect(order.grandTotalMinor).toBe(7500000n);

    // Complete POS checkout
    const completed = await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [
        {
          method: "CASH",
          amountMinor: 7500000n,
          amountReceivedMinor: 8000000n,
        },
      ],
      actorUserId: hostOwnerUserId,
    });

    expect(completed.status).toBe("COMPLETED");

    // Check Host journal entries
    const hostEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, hostTenantId),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(hostEntries).toHaveLength(1);

    const hostLines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, hostEntries[0].id));

    let hostTotalDebit = 0n;
    let hostTotalCredit = 0n;
    for (const line of hostLines) {
      if (line.direction === "DEBIT")
        hostTotalDebit += BigInt(line.amountMinor);
      if (line.direction === "CREDIT")
        hostTotalCredit += BigInt(line.amountMinor);
    }
    // Double-entry invariant
    expect(hostTotalDebit).toBe(hostTotalCredit);

    // Check Solo Professional journal entries
    const soloEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, soloTenantId),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(soloEntries).toHaveLength(1);

    const soloLines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, soloEntries[0].id));

    let soloTotalDebit = 0n;
    let soloTotalCredit = 0n;
    for (const line of soloLines) {
      if (line.direction === "DEBIT")
        soloTotalDebit += BigInt(line.amountMinor);
      if (line.direction === "CREDIT")
        soloTotalCredit += BigInt(line.amountMinor);
    }
    // Double-entry invariant for Solo workspace
    expect(soloTotalDebit).toBe(soloTotalCredit);

    // Verify COGS recognized for Solo Professional: $16,000 COP
    const soloCOGSLine = soloLines.find(
      (l) => l.direction === "DEBIT" && l.memo?.includes("COGS")
    );
    expect(soloCOGSLine).toBeDefined();
    expect(BigInt(soloCOGSLine!.amountMinor)).toBe(1600000n);

    // Verify Inventory Asset reduced for Solo Professional: $16,000 COP
    const soloAssetLine = soloLines.find(
      (l) => l.direction === "CREDIT" && l.memo?.includes("Inventory")
    );
    expect(soloAssetLine).toBeDefined();
    expect(BigInt(soloAssetLine!.amountMinor)).toBe(1600000n);
  });

  it("Appointment POS checkout marks appointment COMPLETED with anti-double-financialization", async () => {
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

    const futureTime = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 10000000));
    const [appointment] = await db
      .insert(appointments)
      .values({
        tenantId: hostTenantId,
        locationId,
        customerNameSnapshot: "Appointment Checkout Test",
        staffId: staff.id,
        status: "CONFIRMED",
        startsAt: futureTime,
        endsAt: new Date(futureTime.getTime() + 45 * 60 * 1000),
      })
      .returning();

    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      appointmentId: appointment.id,
      customerNameSnapshot: appointment.customerNameSnapshot,
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

    const completed = await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [
        {
          method: "CASH",
          amountMinor: BigInt(service.priceMinor),
        },
      ],
      actorUserId: hostOwnerUserId,
    });

    expect(completed.status).toBe("COMPLETED");

    // Appointment must be COMPLETED
    const [updatedAppt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointment.id));
    expect(updatedAppt.status).toBe("COMPLETED");
    expect(updatedAppt.completedAt).toBeDefined();

    // Financial entry source must be ORDER, NOT APPOINTMENT
    const apptEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "APPOINTMENT"),
          eq(journalEntries.sourceId, appointment.id)
        )
      );
    expect(apptEntries).toHaveLength(0); // Zero duplicate appointment journal entries

    const orderEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "ORDER"),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(orderEntries).toHaveLength(1);
  });
});
