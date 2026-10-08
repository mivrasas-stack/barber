import { eq, and, desc, lte, or, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  subscriptionPlans,
  tenantSubscriptions,
  subscriptionInvoices,
  subscriptionInvoiceLines,
  subscriptionStatusHistory,
  billingRuns,
  SubscriptionPlanRow,
  TenantSubscriptionRow,
  SubscriptionInvoiceRow,
  SubscriptionInvoiceLineRow,
  BillingRunRow,
} from "@/infrastructure/database/schema/subscriptions";
import { SubscriptionPlan } from "../domain/subscription-plan";
import { TenantSubscription, SubscriptionStatus, TenantSubscriptionProps } from "../domain/tenant-subscription";
import { SubscriptionInvoice, SubscriptionInvoiceLine, InvoiceStatus } from "../domain/subscription-invoice";
import { SubscriptionStatusHistory } from "../domain/subscription-status-history";
import {
  SubscriptionRepository,
  CreateSubscriptionPlanInput,
  CreateTenantSubscriptionInput,
  CreateSubscriptionInvoiceInput,
  RecordStatusHistoryInput,
} from "../domain/subscription-repository.interface";
import { NotFoundError } from "@/shared/errors/app-error";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  private toPlanDomain(row: SubscriptionPlanRow): SubscriptionPlan {
    return new SubscriptionPlan({
      id: row.id,
      code: row.code,
      name: row.name,
      audience: row.audience as any,
      description: row.description,
      status: row.status as any,
      billingPeriod: row.billingPeriod as any,
      priceMinor: row.priceMinor,
      currency: row.currency,
      trialDays: row.trialDays,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toSubscriptionDomain(row: TenantSubscriptionRow): TenantSubscription {
    return new TenantSubscription({
      id: row.id,
      tenantId: row.tenantId,
      planId: row.planId,
      status: row.status as SubscriptionStatus,
      startsAt: row.startsAt,
      trialEndsAt: row.trialEndsAt,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      pastDueAt: row.pastDueAt,
      graceEndsAt: row.graceEndsAt,
      suspendedAt: row.suspendedAt,
      pendingPlanId: row.pendingPlanId,
      pendingPlanEffectiveAt: row.pendingPlanEffectiveAt,
      paymentMethodToken: row.paymentMethodToken,
      paymentMethodBrand: row.paymentMethodBrand,
      paymentMethodLast4: row.paymentMethodLast4,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toInvoiceDomain(
    row: SubscriptionInvoiceRow,
    lines: SubscriptionInvoiceLineRow[] = []
  ): SubscriptionInvoice {
    return new SubscriptionInvoice({
      id: row.id,
      tenantId: row.tenantId,
      subscriptionId: row.subscriptionId,
      invoiceNumber: row.invoiceNumber,
      status: row.status as InvoiceStatus,
      currency: row.currency,
      subtotalMinor: BigInt(row.subtotalMinor),
      discountMinor: BigInt(row.discountMinor),
      taxMinor: BigInt(row.taxMinor),
      totalMinor: BigInt(row.totalMinor),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      dueAt: row.dueAt,
      paidAt: row.paidAt,
      voidedAt: row.voidedAt,
      planCodeSnapshot: row.planCodeSnapshot,
      planNameSnapshot: row.planNameSnapshot,
      billingPeriodSnapshot: row.billingPeriodSnapshot,
      metadata: row.metadata as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lines: lines.map(
        (l) =>
          new SubscriptionInvoiceLine({
            id: l.id,
            invoiceId: l.invoiceId,
            description: l.description,
            quantity: l.quantity,
            unitPriceMinor: BigInt(l.unitPriceMinor),
            amountMinor: BigInt(l.amountMinor),
            lineType: l.lineType as any,
            createdAt: l.createdAt,
          })
      ),
    });
  }

  async findPlanByCode(code: string): Promise<SubscriptionPlan | null> {
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, code))
      .limit(1);
    if (!rows[0]) return null;
    return this.toPlanDomain(rows[0]);
  }

  async findPlanById(id: string): Promise<SubscriptionPlan | null> {
    if (!isUuid(id)) return null;
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toPlanDomain(rows[0]);
  }

  async listPlans(audience?: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL"): Promise<SubscriptionPlan[]> {
    if (audience && audience !== "ALL") {
      const rows = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.audience, audience));
      return rows.map((r) => this.toPlanDomain(r));
    }
    const rows = await db.select().from(subscriptionPlans);
    return rows.map((r) => this.toPlanDomain(r));
  }

  async createPlan(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> {
    const [row] = await db
      .insert(subscriptionPlans)
      .values({
        code: input.code,
        name: input.name,
        audience: input.audience,
        description: input.description,
        billingPeriod: input.billingPeriod ?? "MONTHLY",
        priceMinor: input.priceMinor,
        currency: input.currency ?? "COP",
        trialDays: input.trialDays ?? 0,
        version: 1,
      })
      .returning();
    return this.toPlanDomain(row);
  }

  async updatePlanPrice(planId: string, newPriceMinor: number): Promise<SubscriptionPlan> {
    const current = await this.findPlanById(planId);
    if (!current) throw new NotFoundError("Subscription plan not found");

    const [row] = await db
      .update(subscriptionPlans)
      .set({
        priceMinor: newPriceMinor,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    return this.toPlanDomain(row);
  }

  async findSubscriptionByTenant(tenantId: string): Promise<TenantSubscription | null> {
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .orderBy(desc(tenantSubscriptions.createdAt))
      .limit(1);
    if (!rows[0]) return null;
    return this.toSubscriptionDomain(rows[0]);
  }

  async findSubscriptionById(id: string): Promise<TenantSubscription | null> {
    if (!isUuid(id)) return null;
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toSubscriptionDomain(rows[0]);
  }

  async createSubscription(input: CreateTenantSubscriptionInput): Promise<TenantSubscription> {
    const now = input.startsAt ?? new Date();
    let trialDays = input.trialDays;
    if (trialDays === undefined) {
      const plan = await this.findPlanById(input.planId);
      trialDays = plan ? plan.trialDays : 0;
    }
    const trialEndsAt = input.trialEndsAt !== undefined
      ? input.trialEndsAt
      : trialDays > 0
        ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : null;

    const status = input.status ?? (trialDays > 0 ? "TRIALING" : "ACTIVE");
    const defaultPeriodEnd =
      trialDays === 0
        ? now
        : (trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

    const [row] = await db
      .insert(tenantSubscriptions)
      .values({
        tenantId: input.tenantId,
        planId: input.planId,
        status,
        startsAt: now,
        trialEndsAt,
        currentPeriodStart: input.currentPeriodStart ?? now,
        currentPeriodEnd: input.currentPeriodEnd ?? defaultPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        pastDueAt: input.pastDueAt ?? null,
        graceEndsAt: input.graceEndsAt ?? null,
        suspendedAt: input.suspendedAt ?? null,
      })
      .returning();
    return this.toSubscriptionDomain(row);
  }

  async updateSubscriptionStatus(
    tenantId: string,
    status: SubscriptionStatus
  ): Promise<TenantSubscription> {
    const [row] = await db
      .update(tenantSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .returning();
    if (!row) throw new NotFoundError("Tenant subscription not found");
    return this.toSubscriptionDomain(row);
  }

  async updateSubscription(
    id: string,
    updates: Partial<TenantSubscriptionProps>
  ): Promise<TenantSubscription> {
    const setPayload: any = { updatedAt: new Date() };
    if (updates.status !== undefined) setPayload.status = updates.status;
    if (updates.planId !== undefined) setPayload.planId = updates.planId;
    if (updates.trialEndsAt !== undefined) setPayload.trialEndsAt = updates.trialEndsAt;
    if (updates.currentPeriodStart !== undefined) setPayload.currentPeriodStart = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) setPayload.currentPeriodEnd = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) setPayload.cancelAtPeriodEnd = updates.cancelAtPeriodEnd;
    if (updates.pastDueAt !== undefined) setPayload.pastDueAt = updates.pastDueAt;
    if (updates.graceEndsAt !== undefined) setPayload.graceEndsAt = updates.graceEndsAt;
    if (updates.suspendedAt !== undefined) setPayload.suspendedAt = updates.suspendedAt;
    if (updates.pendingPlanId !== undefined) setPayload.pendingPlanId = updates.pendingPlanId;
    if (updates.pendingPlanEffectiveAt !== undefined) setPayload.pendingPlanEffectiveAt = updates.pendingPlanEffectiveAt;
    if (updates.paymentMethodToken !== undefined) setPayload.paymentMethodToken = updates.paymentMethodToken;
    if (updates.paymentMethodBrand !== undefined) setPayload.paymentMethodBrand = updates.paymentMethodBrand;
    if (updates.paymentMethodLast4 !== undefined) setPayload.paymentMethodLast4 = updates.paymentMethodLast4;

    const [row] = await db
      .update(tenantSubscriptions)
      .set(setPayload)
      .where(eq(tenantSubscriptions.id, id))
      .returning();

    if (!row) throw new NotFoundError("Tenant subscription not found");
    return this.toSubscriptionDomain(row);
  }

  async changeSubscriptionPlan(
    tenantId: string,
    newPlanId: string
  ): Promise<TenantSubscription> {
    const [row] = await db
      .update(tenantSubscriptions)
      .set({ planId: newPlanId, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .returning();
    if (!row) throw new NotFoundError("Tenant subscription not found");
    return this.toSubscriptionDomain(row);
  }

  async listSubscriptionsDueForBilling(asOf: Date): Promise<TenantSubscription[]> {
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          inArray(tenantSubscriptions.status, ["ACTIVE", "TRIALING", "PAST_DUE", "GRACE_PERIOD"]),
          lte(tenantSubscriptions.currentPeriodEnd, asOf)
        )
      );
    return rows.map((r) => this.toSubscriptionDomain(r));
  }

  async listPastDueSubscriptions(asOf: Date): Promise<TenantSubscription[]> {
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        inArray(tenantSubscriptions.status, ["PAST_DUE", "GRACE_PERIOD"])
      );
    return rows.map((r) => this.toSubscriptionDomain(r));
  }

  async listTrialsExpiring(asOf: Date): Promise<TenantSubscription[]> {
    const rows = await db
      .select()
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.status, "TRIALING"),
          lte(tenantSubscriptions.trialEndsAt, asOf)
        )
      );
    return rows.map((r) => this.toSubscriptionDomain(r));
  }

  async createInvoice(input: CreateSubscriptionInvoiceInput): Promise<SubscriptionInvoice> {
    return await db.transaction(async (tx) => {
      const [invoiceRow] = await tx
        .insert(subscriptionInvoices)
        .values({
          tenantId: input.tenantId,
          subscriptionId: input.subscriptionId,
          invoiceNumber: input.invoiceNumber,
          status: input.status ?? "OPEN",
          currency: input.currency,
          subtotalMinor: input.subtotalMinor,
          discountMinor: input.discountMinor ?? BigInt(0),
          taxMinor: input.taxMinor ?? BigInt(0),
          totalMinor: input.totalMinor,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          dueAt: input.dueAt,
          planCodeSnapshot: input.planCodeSnapshot,
          planNameSnapshot: input.planNameSnapshot,
          billingPeriodSnapshot: input.billingPeriodSnapshot ?? "MONTHLY",
          metadata: input.metadata,
        })
        .returning();

      const lineRows: SubscriptionInvoiceLineRow[] = [];
      for (const line of input.lines) {
        const [insertedLine] = await tx
          .insert(subscriptionInvoiceLines)
          .values({
            invoiceId: invoiceRow.id,
            description: line.description,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            amountMinor: line.amountMinor,
            lineType: line.lineType ?? "PLAN_CHARGE",
          })
          .returning();
        lineRows.push(insertedLine);
      }

      return this.toInvoiceDomain(invoiceRow, lineRows);
    });
  }

  async findInvoiceById(id: string): Promise<SubscriptionInvoice | null> {
    if (!isUuid(id)) return null;
    const [row] = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, id))
      .limit(1);
    if (!row) return null;

    const lines = await db
      .select()
      .from(subscriptionInvoiceLines)
      .where(eq(subscriptionInvoiceLines.invoiceId, row.id));

    return this.toInvoiceDomain(row, lines);
  }

  async findInvoiceByNumber(invoiceNumber: string): Promise<SubscriptionInvoice | null> {
    const [row] = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.invoiceNumber, invoiceNumber))
      .limit(1);
    if (!row) return null;

    const lines = await db
      .select()
      .from(subscriptionInvoiceLines)
      .where(eq(subscriptionInvoiceLines.invoiceId, row.id));

    return this.toInvoiceDomain(row, lines);
  }

  async findInvoiceBySubscriptionAndPeriod(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SubscriptionInvoice | null> {
    const [row] = await db
      .select()
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.subscriptionId, subscriptionId),
          eq(subscriptionInvoices.periodStart, periodStart),
          eq(subscriptionInvoices.periodEnd, periodEnd)
        )
      )
      .limit(1);
    if (!row) return null;

    const lines = await db
      .select()
      .from(subscriptionInvoiceLines)
      .where(eq(subscriptionInvoiceLines.invoiceId, row.id));

    return this.toInvoiceDomain(row, lines);
  }

  async listInvoicesByTenant(tenantId: string): Promise<SubscriptionInvoice[]> {
    const rows = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.tenantId, tenantId))
      .orderBy(desc(subscriptionInvoices.createdAt));

    const result: SubscriptionInvoice[] = [];
    for (const r of rows) {
      const lines = await db
        .select()
        .from(subscriptionInvoiceLines)
        .where(eq(subscriptionInvoiceLines.invoiceId, r.id));
      result.push(this.toInvoiceDomain(r, lines));
    }
    return result;
  }

  async listOpenInvoices(dueBefore?: Date): Promise<SubscriptionInvoice[]> {
    let query = db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.status, "OPEN"))
      .orderBy(subscriptionInvoices.dueAt);

    if (dueBefore) {
      query = db
        .select()
        .from(subscriptionInvoices)
        .where(
          and(
            eq(subscriptionInvoices.status, "OPEN"),
            lte(subscriptionInvoices.dueAt, dueBefore)
          )
        )
        .orderBy(subscriptionInvoices.dueAt) as any;
    }

    const rows = await query;
    const result: SubscriptionInvoice[] = [];
    for (const r of rows) {
      const lines = await db
        .select()
        .from(subscriptionInvoiceLines)
        .where(eq(subscriptionInvoiceLines.invoiceId, r.id));
      result.push(this.toInvoiceDomain(r, lines));
    }
    return result;
  }

  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    updates?: { paidAt?: Date; voidedAt?: Date }
  ): Promise<SubscriptionInvoice> {
    const setPayload: any = { status, updatedAt: new Date() };
    if (updates?.paidAt !== undefined) setPayload.paidAt = updates.paidAt;
    if (updates?.voidedAt !== undefined) setPayload.voidedAt = updates.voidedAt;

    const [row] = await db
      .update(subscriptionInvoices)
      .set(setPayload)
      .where(eq(subscriptionInvoices.id, id))
      .returning();

    if (!row) throw new NotFoundError("Subscription invoice not found");

    const lines = await db
      .select()
      .from(subscriptionInvoiceLines)
      .where(eq(subscriptionInvoiceLines.invoiceId, row.id));

    return this.toInvoiceDomain(row, lines);
  }

  async recordStatusHistory(input: RecordStatusHistoryInput): Promise<SubscriptionStatusHistory> {
    const [row] = await db
      .insert(subscriptionStatusHistory)
      .values({
        subscriptionId: input.subscriptionId,
        tenantId: input.tenantId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.reason,
        source: input.source,
        actorUserId: input.actorUserId,
        metadata: input.metadata,
      })
      .returning();

    return new SubscriptionStatusHistory({
      id: row.id,
      subscriptionId: row.subscriptionId,
      tenantId: row.tenantId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      reason: row.reason,
      source: row.source,
      actorUserId: row.actorUserId,
      metadata: row.metadata as any,
      createdAt: row.createdAt,
    });
  }

  async listStatusHistory(subscriptionId: string): Promise<SubscriptionStatusHistory[]> {
    const rows = await db
      .select()
      .from(subscriptionStatusHistory)
      .where(eq(subscriptionStatusHistory.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionStatusHistory.createdAt));

    return rows.map(
      (r) =>
        new SubscriptionStatusHistory({
          id: r.id,
          subscriptionId: r.subscriptionId,
          tenantId: r.tenantId,
          fromStatus: r.fromStatus,
          toStatus: r.toStatus,
          reason: r.reason,
          source: r.source,
          actorUserId: r.actorUserId,
          metadata: r.metadata as any,
          createdAt: r.createdAt,
        })
    );
  }

  async createBillingRun(run: Partial<BillingRunRow>): Promise<BillingRunRow> {
    const [row] = await db
      .insert(billingRuns)
      .values({
        status: run.status ?? "RUNNING",
        startedAt: run.startedAt ?? new Date(),
        tenantsProcessed: run.tenantsProcessed ?? 0,
        invoicesCreated: run.invoicesCreated ?? 0,
        paymentsAttempted: run.paymentsAttempted ?? 0,
        errorsCount: run.errorsCount ?? 0,
        summary: run.summary,
        triggeredByUserId: run.triggeredByUserId,
      })
      .returning();
    return row;
  }

  async updateBillingRun(id: string, updates: Partial<BillingRunRow>): Promise<BillingRunRow> {
    const [row] = await db
      .update(billingRuns)
      .set(updates)
      .where(eq(billingRuns.id, id))
      .returning();
    if (!row) throw new NotFoundError("Billing run not found");
    return row;
  }

  async findActiveBillingRun(): Promise<BillingRunRow | null> {
    const [row] = await db
      .select()
      .from(billingRuns)
      .where(eq(billingRuns.status, "RUNNING"))
      .orderBy(desc(billingRuns.startedAt))
      .limit(1);
    return row ?? null;
  }
}
