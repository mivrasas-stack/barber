import { describe, it, expect, beforeAll } from "vitest";
import { eq, and, sql } from "drizzle-orm";
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
} from "@/infrastructure/database/schema";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { DrizzleFinanceRepository } from "@/modules/finance/infrastructure/drizzle-finance.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { AdjustStockUseCase } from "@/modules/inventory/application/adjust-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { CompleteOrderUseCase } from "@/modules/pos/application/complete-order.usecase";

describe("Stage 3B Reconciliation & Mathematical Invariant Suites", () => {
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

  it("Mathematical Invariant 1: Inventory Physical Position strictly equals Net Immutable Movements", async () => {
    const suffix = `recon-inv-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Reconciliation Shampoo ${suffix}`,
      variants: [
        {
          sku: `REC-SHP-${suffix}`,
          name: "250ml",
          priceMinor: 2000000n,
          costMinor: 800000n,
        },
      ],
    });
    const variantId = product.variants[0].id;

    // Receive 20 units
    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 20,
      unitCostMinor: 800000n,
      actorUserId: hostOwnerUserId,
    });

    // Sell 6 units across 2 orders (4 + 2)
    const createDraft = new CreateDraftOrderUseCase(orderRepo, productRepo);
    const order1 = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 4,
        },
      ],
    });
    await completeOrderUseCase.execute({
      orderId: order1.id,
      tenders: [{ method: "CASH", amountMinor: 8000000n }],
      actorUserId: hostOwnerUserId,
    });

    const order2 = await createDraft.execute({
      contextTenantId: hostTenantId,
      locationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: variantId,
          quantity: 2,
        },
      ],
    });
    await completeOrderUseCase.execute({
      orderId: order2.id,
      tenders: [{ method: "CASH", amountMinor: 4000000n }],
      actorUserId: hostOwnerUserId,
    });

    // Adjust down 3 units (Damage)
    await new AdjustStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantityDelta: -3,
      movementType: "DAMAGE",
      reason: "Broken bottle in transport",
      actorUserId: hostOwnerUserId,
    });

    // Adjust up 1 unit
    await new AdjustStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantityDelta: 1,
      movementType: "ADJUSTMENT_IN",
      reason: "Found surplus in back shelf",
      actorUserId: hostOwnerUserId,
    });

    // Current position
    const position = await inventoryRepo.findPosition(
      hostTenantId,
      locationId,
      variantId
    );
    expect(position).toBeDefined();

    // Net sum of all stock movements:
    // +20 (receipt) - 4 (sale) - 2 (sale) - 3 (damage) + 1 (adjustment) = 12
    const allMovements = await inventoryRepo.findMovements(hostTenantId, {
      locationId,
      productVariantId: variantId,
    });

    const INCREMENT_TYPES = new Set([
      "INITIAL_BALANCE",
      "PURCHASE_RECEIPT",
      "SALE_RETURN",
      "TRANSFER_IN",
      "ADJUSTMENT_IN",
    ]);

    let netMovement = 0;
    for (const m of allMovements) {
      if (INCREMENT_TYPES.has(m.movementType)) {
        netMovement += m.quantity;
      } else {
        netMovement -= m.quantity;
      }
    }

    expect(position!.onHand).toBe(12);
    expect(position!.onHand).toBe(netMovement);
  });

  it("Mathematical Invariant 2: Order Grand Total equals Ledger Debits & COGS equals Inventory Asset Reduction", async () => {
    const suffix = `recon-cogs-${Date.now()}`;
    const createProduct = new CreateProductUseCase(productRepo);
    const product = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Reconciliation Wax ${suffix}`,
      variants: [
        {
          sku: `REC-WAX-${suffix}`,
          name: "Wax 80g",
          priceMinor: 3500000n, // $35,000 COP
          costMinor: 1500000n, // $15,000 COP
        },
      ],
    });
    const variantId = product.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepo).execute({
      ownerTenantId: hostTenantId,
      locationId,
      productVariantId: variantId,
      quantity: 10,
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
          quantity: 3, // 3 * $35,000 = $105,000 COP revenue. Cost = 3 * $15,000 = $45,000 COP
        },
      ],
    });

    const completed = await completeOrderUseCase.execute({
      orderId: order.id,
      tenders: [{ method: "CASH", amountMinor: 10500000n }],
      actorUserId: hostOwnerUserId,
    });

    expect(completed.status).toBe("COMPLETED");

    // Fetch journal lines for this order
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.sourceType, "ORDER"),
          eq(journalEntries.sourceId, order.id)
        )
      );
    expect(entry).toBeDefined();

    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entry.id));

    // Debits to Cash / Receivable must match grand total ($105,000)
    const cashDebit = lines.find(
      (l) => l.direction === "DEBIT" && l.memo?.includes("Total Collection")
    );
    expect(cashDebit).toBeDefined();
    expect(BigInt(cashDebit!.amountMinor)).toBe(10500000n);

    // Credit to Revenue must match $105,000
    const revCredit = lines.find(
      (l) => l.direction === "CREDIT" && l.memo?.includes("Revenue")
    );
    expect(revCredit).toBeDefined();
    expect(BigInt(revCredit!.amountMinor)).toBe(10500000n);

    // Debit to COGS must equal quantity * unit cost: 3 * $15,000 = $45,000
    const cogsDebit = lines.find(
      (l) => l.direction === "DEBIT" && l.memo?.includes("COGS")
    );
    expect(cogsDebit).toBeDefined();
    expect(BigInt(cogsDebit!.amountMinor)).toBe(4500000n);

    // Credit to Inventory Asset must equal quantity * unit cost: $45,000
    const assetCredit = lines.find(
      (l) => l.direction === "CREDIT" && l.memo?.includes("Inventory")
    );
    expect(assetCredit).toBeDefined();
    expect(BigInt(assetCredit!.amountMinor)).toBe(4500000n);

    // SUM(DEBIT) === SUM(CREDIT)
    let totalDebit = 0n;
    let totalCredit = 0n;
    for (const line of lines) {
      if (line.direction === "DEBIT") totalDebit += BigInt(line.amountMinor);
      if (line.direction === "CREDIT") totalCredit += BigInt(line.amountMinor);
    }
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(15000000n); // $105,000 + $45,000 = $150,000
  });

  it("Mathematical Invariant 3: Zero unbalanced posted journal entries across whole database", async () => {
    const postedEntries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.status, "POSTED"));

    expect(postedEntries.length).toBeGreaterThan(0);

    for (const entry of postedEntries) {
      const lines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, entry.id));

      expect(lines.length).toBeGreaterThanOrEqual(2);

      let totalDebit = 0n;
      let totalCredit = 0n;
      for (const line of lines) {
        if (line.direction === "DEBIT") totalDebit += BigInt(line.amountMinor);
        if (line.direction === "CREDIT") totalCredit += BigInt(line.amountMinor);
      }

      expect(totalDebit).toBe(totalCredit);
    }
  });
});
