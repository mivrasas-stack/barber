import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/infrastructure/database/client";
import {
  locations,
  membershipRoles,
  memberships,
  modules,
  permissions,
  professionalAffiliationLocations,
  professionalAffiliations,
  productVariants,
  rolePermissions,
  roles,
  subscriptionPlans,
  tenants,
  tenantSubscriptions,
  users,
} from "@/infrastructure/database/schema";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "@/infrastructure/auth/session";
import { authorizeCommerceRequest } from "@/modules/commerce/infrastructure/commerce-auth";
import { DrizzleProductRepository } from "@/modules/commerce/infrastructure/drizzle-product.repository";
import { DrizzleInventoryRepository } from "@/modules/inventory/infrastructure/drizzle-inventory.repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order.repository";
import { CreateProductUseCase } from "@/modules/commerce/application/create-product.usecase";
import { ReceiveStockUseCase } from "@/modules/inventory/application/receive-stock.usecase";
import { CreateDraftOrderUseCase } from "@/modules/orders/application/create-draft-order.usecase";
import { ForbiddenError } from "@/shared/errors/app-error";
import { GET as getProducts } from "@/app/api/v1/products/route";
import { GET as getInventory } from "@/app/api/v1/inventory/route";
import { GET as getInventoryMovements } from "@/app/api/v1/inventory/movements/route";
import { GET as getOrder } from "@/app/api/v1/orders/[id]/route";

const STAGE_3B_MODULE_CODES = [
  "commerce.products",
  "inventory.stock",
  "commerce.orders",
  "pos.checkout",
] as const;

function requestFor(token: string, tenantId: string, path: string): NextRequest {
  const separator = path.includes("?") ? "&" : "?";
  return new NextRequest(
    `http://localhost:3000${path}${separator}tenantId=${tenantId}`,
    {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    }
  );
}

describe("Stage 3B commerce authorization and privacy boundaries", () => {
  const productRepository = new DrizzleProductRepository();
  const inventoryRepository = new DrizzleInventoryRepository();
  const orderRepository = new DrizzleOrderRepository();

  let hostTenantId: string;
  let soloTenantId: string;
  let primaryLocationId: string;
  let secondaryLocationId: string;
  let affiliationId: string;
  let hostOwnerUserId: string;
  let hostEmployeeUserId: string;
  let professionalUserId: string;
  let hostOwnerToken: string;
  let hostEmployeeToken: string;
  let professionalToken: string;
  let hostProductId: string;
  let hostVariantId: string;
  let professionalProductId: string;
  let professionalVariantId: string;
  let testHostSubscriptionId: string;
  const originalModuleStatuses = new Map<string, string>();

  beforeAll(async () => {
    const [hostTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "the-royal-barber"))
      .limit(1);
    const [soloTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, "carlos-barber-studio"))
      .limit(1);
    expect(hostTenant).toBeDefined();
    expect(soloTenant).toBeDefined();
    hostTenantId = hostTenant.id;
    soloTenantId = soloTenant.id;

    const [activeAffiliationLocation] = await db
      .select({
        affiliationId: professionalAffiliations.id,
        locationId: professionalAffiliationLocations.locationId,
      })
      .from(professionalAffiliations)
      .innerJoin(
        professionalAffiliationLocations,
        eq(
          professionalAffiliationLocations.affiliationId,
          professionalAffiliations.id
        )
      )
      .where(
        and(
          eq(professionalAffiliations.hostTenantId, hostTenantId),
          eq(
            professionalAffiliations.professionalWorkspaceTenantId,
            soloTenantId
          ),
          eq(professionalAffiliations.status, "ACTIVE"),
          eq(professionalAffiliationLocations.status, "ACTIVE")
        )
      )
      .limit(1);
    expect(activeAffiliationLocation).toBeDefined();
    affiliationId = activeAffiliationLocation.affiliationId;
    primaryLocationId = activeAffiliationLocation.locationId;

    const hostLocations = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.tenantId, hostTenantId));
    const secondaryLocation = hostLocations.find(
      (location) => location.id !== primaryLocationId
    );
    expect(secondaryLocation).toBeDefined();
    secondaryLocationId = secondaryLocation!.id;

    const seededUsers = await db
      .select()
      .from(users)
      .where(
        inArray(users.emailNormalized, [
          "owner@royalbarber.dev",
          "barber1@royalbarber.dev",
          "carlos.independent@royalbarber.dev",
        ])
      );
    const hostOwner = seededUsers.find(
      (user) => user.emailNormalized === "owner@royalbarber.dev"
    );
    const hostEmployee = seededUsers.find(
      (user) => user.emailNormalized === "barber1@royalbarber.dev"
    );
    const professional = seededUsers.find(
      (user) =>
        user.emailNormalized === "carlos.independent@royalbarber.dev"
    );
    expect(hostOwner).toBeDefined();
    expect(hostEmployee).toBeDefined();
    expect(professional).toBeDefined();
    hostOwnerUserId = hostOwner!.id;
    hostEmployeeUserId = hostEmployee!.id;
    professionalUserId = professional!.id;

    const [ownerSession, employeeSession, professionalSession] =
      await Promise.all([
        createSession(hostOwner!),
        createSession(hostEmployee!),
        createSession(professional!),
      ]);
    hostOwnerToken = ownerSession.token;
    hostEmployeeToken = employeeSession.token;
    professionalToken = professionalSession.token;

    const moduleRows = await db
      .select()
      .from(modules)
      .where(inArray(modules.code, [...STAGE_3B_MODULE_CODES]));
    expect(moduleRows).toHaveLength(STAGE_3B_MODULE_CODES.length);
    for (const moduleRow of moduleRows) {
      originalModuleStatuses.set(moduleRow.code, moduleRow.status);
    }
    await db
      .update(modules)
      .set({ status: "AVAILABLE", updatedAt: new Date() })
      .where(inArray(modules.code, [...STAGE_3B_MODULE_CODES]));

    const [businessPlan] = await db
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, "BUSINESS_BASIC"))
      .limit(1);
    expect(businessPlan).toBeDefined();
    const now = new Date();
    const [hostSubscription] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId: hostTenantId,
        planId: businessPlan.id,
        status: "ACTIVE",
        startsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: tenantSubscriptions.id });
    testHostSubscriptionId = hostSubscription.id;

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createProduct = new CreateProductUseCase(productRepository);
    const hostProduct = await createProduct.execute({
      ownerTenantId: hostTenantId,
      name: `Security Host Product ${suffix}`,
      variants: [
        {
          sku: `SEC-HOST-${suffix}`,
          name: "Host Variant",
          priceMinor: 3500000n,
          costMinor: 1400000n,
        },
      ],
    });
    hostProductId = hostProduct.id;
    hostVariantId = hostProduct.variants[0].id;

    const professionalProduct = await createProduct.execute({
      ownerTenantId: soloTenantId,
      name: `Security Professional Product ${suffix}`,
      variants: [
        {
          sku: `SEC-PRO-${suffix}`,
          name: "Professional Variant",
          priceMinor: 4200000n,
          costMinor: 1800000n,
        },
      ],
    });
    professionalProductId = professionalProduct.id;
    professionalVariantId = professionalProduct.variants[0].id;

    await new ReceiveStockUseCase(inventoryRepository).execute({
      ownerTenantId: soloTenantId,
      locationId: primaryLocationId,
      productVariantId: professionalVariantId,
      quantity: 7,
      unitCostMinor: 1800000n,
      actorUserId: professionalUserId,
      reason: "Stage 3B security boundary fixture",
    });
  });

  afterAll(async () => {
    if (testHostSubscriptionId) {
      await db
        .delete(tenantSubscriptions)
        .where(eq(tenantSubscriptions.id, testHostSubscriptionId));
    }
    for (const [code, status] of originalModuleStatuses) {
      await db
        .update(modules)
        .set({ status, updatedAt: new Date() })
        .where(eq(modules.code, code));
    }
  });

  it("binds requiredPermission to the active membership role IDs", async () => {
    const [managePermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.code, "products.manage"))
      .limit(1);
    expect(managePermission).toBeDefined();

    const [foreignSameNameRole] = await db
      .insert(roles)
      .values({
        tenantId: soloTenantId,
        name: "EMPLOYEE",
        description: "Adversarial same-name role for authorization isolation",
      })
      .returning();

    try {
      await db.insert(rolePermissions).values({
        roleId: foreignSameNameRole.id,
        permissionId: managePermission.id,
      });

      const readAuthorization = await authorizeCommerceRequest(
        requestFor(hostEmployeeToken, hostTenantId, "/api/v1/products"),
        {
          requiredModule: "commerce.products",
          requiredPermission: "products.read",
        }
      );
      expect(readAuthorization.membershipId).toBeTruthy();
      expect(readAuthorization.hasPermission("products.read")).toBe(true);

      await expect(
        authorizeCommerceRequest(
          requestFor(hostEmployeeToken, hostTenantId, "/api/v1/products"),
          {
            requiredModule: "commerce.products",
            requiredPermission: "products.manage",
          }
        )
      ).rejects.toThrow(/PERMISSION_DENIED/);
    } finally {
      await db.delete(roles).where(eq(roles.id, foreignSameNameRole.id));
    }
  });

  it("denies commerce before RBAC when the required module is non-public", async () => {
    await db
      .update(modules)
      .set({ status: "INTERNAL", updatedAt: new Date() })
      .where(eq(modules.code, "commerce.products"));

    try {
      await expect(
        authorizeCommerceRequest(
          requestFor(hostOwnerToken, hostTenantId, "/api/v1/products"),
          {
            requiredModule: "commerce.products",
            requiredPermission: "products.read",
          }
        )
      ).rejects.toThrow(/MODULE_NOT_ENTITLED/);
    } finally {
      await db
        .update(modules)
        .set({ status: "AVAILABLE", updatedAt: new Date() })
        .where(eq(modules.code, "commerce.products"));
    }
  });

  it("rejects tenant spoofing even for an owner of another workspace", async () => {
    await expect(
      authorizeCommerceRequest(
        requestFor(hostOwnerToken, soloTenantId, "/api/v1/products"),
        {
          requiredModule: "commerce.products",
          requiredPermission: "products.read",
        }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("requires an ACTIVE affiliation before host custody can be authorized", async () => {
    await db
      .update(professionalAffiliations)
      .set({ status: "SUSPENDED", updatedAt: new Date() })
      .where(eq(professionalAffiliations.id, affiliationId));

    try {
      await expect(
        authorizeCommerceRequest(
          requestFor(
            professionalToken,
            hostTenantId,
            "/api/v1/inventory"
          ),
          {
            requiredModule: "inventory.stock",
            requiredPermission: "inventory.positions.read",
          }
        )
      ).rejects.toThrow(/AFFILIATION_REQUIRED/);
    } finally {
      await db
        .update(professionalAffiliations)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(professionalAffiliations.id, affiliationId));
    }
  });

  it("allows professional-owned stock only at the authorized host location", async () => {
    const professionalAuthorization = await authorizeCommerceRequest(
      requestFor(professionalToken, hostTenantId, "/api/v1/inventory"),
      {
        requiredModule: "inventory.stock",
        requiredPermission: "inventory.positions.read",
      }
    );
    expect(professionalAuthorization.actorOwnerTenantId).toBe(soloTenantId);
    expect(professionalAuthorization.authorizedLocationIds).toContain(
      primaryLocationId
    );
    expect(() =>
      professionalAuthorization.assertLocationAccess(primaryLocationId)
    ).not.toThrow();
    expect(() =>
      professionalAuthorization.assertLocationAccess(secondaryLocationId)
    ).toThrow(/LOCATION_SCOPE_DENIED/);
    await expect(
      professionalAuthorization.assertProductVariantOwnership(
        professionalVariantId
      )
    ).resolves.toBeUndefined();
    await expect(
      professionalAuthorization.assertProductVariantOwnership(hostVariantId)
    ).rejects.toThrow(/OWNER_SCOPE_DENIED/);

    const hostAuthorization = await authorizeCommerceRequest(
      requestFor(hostOwnerToken, hostTenantId, "/api/v1/inventory"),
      {
        requiredModule: "inventory.stock",
        requiredPermission: "inventory.positions.read",
      }
    );
    await expect(
      hostAuthorization.assertProductVariantOwnership(professionalVariantId)
    ).rejects.toThrow(/OWNER_SCOPE_DENIED/);
  });

  it("does not leak product or inventory cost data without explicit permission", async () => {
    const employeeProductsResponse = await getProducts(
      requestFor(hostEmployeeToken, hostTenantId, "/api/v1/products")
    );
    expect(employeeProductsResponse.status).toBe(200);
    const employeeProducts = await employeeProductsResponse.json();
    const employeeHostProduct = employeeProducts.data.products.find(
      (product: { id: string }) => product.id === hostProductId
    );
    expect(employeeHostProduct).toBeDefined();
    expect(employeeHostProduct.variants[0]).not.toHaveProperty("costMinor");

    const ownerProductsResponse = await getProducts(
      requestFor(hostOwnerToken, hostTenantId, "/api/v1/products")
    );
    expect(ownerProductsResponse.status).toBe(200);
    const ownerProducts = await ownerProductsResponse.json();
    const ownerHostProduct = ownerProducts.data.products.find(
      (product: { id: string }) => product.id === hostProductId
    );
    expect(ownerHostProduct.variants[0].costMinor).toBe("1400000");

    const professionalProductsResponse = await getProducts(
      requestFor(professionalToken, hostTenantId, "/api/v1/products")
    );
    expect(professionalProductsResponse.status).toBe(200);
    const professionalProducts = await professionalProductsResponse.json();
    expect(
      professionalProducts.data.products.some(
        (product: { id: string }) => product.id === professionalProductId
      )
    ).toBe(true);
    expect(
      professionalProducts.data.products.some(
        (product: { id: string }) => product.id === hostProductId
      )
    ).toBe(false);
    for (const product of professionalProducts.data.products) {
      for (const variant of product.variants) {
        expect(variant).not.toHaveProperty("costMinor");
      }
    }

    const inventoryResponse = await getInventory(
      requestFor(
        professionalToken,
        hostTenantId,
        `/api/v1/inventory?locationId=${primaryLocationId}&productVariantId=${professionalVariantId}`
      )
    );
    expect(inventoryResponse.status).toBe(200);
    const inventory = await inventoryResponse.json();
    expect(inventory.data.summary).not.toHaveProperty("totalValuationMinor");
    expect(inventory.data.items[0]).not.toHaveProperty("valuationMinor");
    expect(inventory.data.items[0].variant).not.toHaveProperty("costMinor");

    const movementsResponse = await getInventoryMovements(
      requestFor(
        professionalToken,
        hostTenantId,
        `/api/v1/inventory/movements?locationId=${primaryLocationId}&productVariantId=${professionalVariantId}`
      )
    );
    expect(movementsResponse.status).toBe(200);
    const movements = await movementsResponse.json();
    expect(movements.data.movements.length).toBeGreaterThan(0);
    for (const movement of movements.data.movements) {
      expect(movement).not.toHaveProperty("unitCostMinor");
    }
  });

  it("rejects foreign-seller order injection and redacts professional order DTOs", async () => {
    const authorization = await authorizeCommerceRequest(
      requestFor(professionalToken, hostTenantId, "/api/v1/orders"),
      {
        requiredModule: "commerce.orders",
        requiredPermission: "orders.manage",
      }
    );
    const allowedSellerTenantIds =
      await authorization.getAllowedSellerTenantIds(primaryLocationId);
    expect(allowedSellerTenantIds).toEqual([soloTenantId]);

    const createOrder = new CreateDraftOrderUseCase(
      orderRepository,
      productRepository
    );
    await expect(
      createOrder.execute({
        contextTenantId: hostTenantId,
        locationId: primaryLocationId,
        items: [
          {
            itemType: "PRODUCT",
            productVariantId: hostVariantId,
            quantity: 1,
          },
        ],
        allowedSellerTenantIds,
      })
    ).rejects.toThrow(/SELLER_SCOPE_DENIED/);

    const order = await createOrder.execute({
      contextTenantId: hostTenantId,
      locationId: primaryLocationId,
      customerNameSnapshot: "Private Customer",
      customerEmailSnapshot: "private.customer@example.com",
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: professionalVariantId,
          quantity: 1,
        },
      ],
      allowedSellerTenantIds,
      createdByUserId: professionalUserId,
    });

    const orderResponse = await getOrder(
      requestFor(
        professionalToken,
        hostTenantId,
        `/api/v1/orders/${order.id}`
      ),
      { params: Promise.resolve({ id: order.id }) }
    );
    expect(orderResponse.status).toBe(200);
    const orderBody = await orderResponse.json();
    expect(orderBody.data.order).not.toHaveProperty("customerUserId");
    expect(orderBody.data.order).not.toHaveProperty("customerEmailSnapshot");
    expect(orderBody.data.order.items[0]).not.toHaveProperty("unitCostMinor");

    const foreignOrder = await createOrder.execute({
      contextTenantId: hostTenantId,
      locationId: primaryLocationId,
      items: [
        {
          itemType: "PRODUCT",
          productVariantId: hostVariantId,
          quantity: 1,
        },
      ],
      allowedSellerTenantIds: [hostTenantId],
      createdByUserId: hostOwnerUserId,
    });
    expect(() => authorization.assertOrderAccess(foreignOrder)).toThrow(
      /SELLER_SCOPE_DENIED/
    );
  });

  it("keeps seeded Stage 3B modules non-public after the security suite", async () => {
    for (const code of STAGE_3B_MODULE_CODES) {
      expect(originalModuleStatuses.get(code)).toBe("INTERNAL");
    }

    const [affiliateRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.name, "AFFILIATED_PROFESSIONAL"),
          isNull(roles.tenantId)
        )
      )
      .limit(1);
    const [professionalMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, hostTenantId),
          eq(memberships.userId, professionalUserId),
          eq(memberships.status, "ACTIVE")
        )
      )
      .limit(1);
    expect(affiliateRole).toBeDefined();
    expect(professionalMembership).toBeDefined();
    const [binding] = await db
      .select({ id: membershipRoles.id })
      .from(membershipRoles)
      .where(
        and(
          eq(membershipRoles.membershipId, professionalMembership.id),
          eq(membershipRoles.roleId, affiliateRole.id)
        )
      )
      .limit(1);
    expect(binding).toBeDefined();
  });
});
