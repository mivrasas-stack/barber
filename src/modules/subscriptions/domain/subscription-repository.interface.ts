import { SubscriptionPlan } from "./subscription-plan";
import { TenantSubscription, SubscriptionStatus, TenantSubscriptionProps } from "./tenant-subscription";
import { SubscriptionInvoice, InvoiceStatus, SubscriptionInvoiceLineProps } from "./subscription-invoice";
import { SubscriptionStatusHistory } from "./subscription-status-history";
import { BillingRunRow } from "@/infrastructure/database/schema/subscriptions";

export interface CreateSubscriptionPlanInput {
  code: string;
  name: string;
  audience: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL";
  description?: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  priceMinor?: number;
  currency?: string;
  trialDays?: number;
}

export interface CreateTenantSubscriptionInput {
  tenantId: string;
  planId: string;
  status?: SubscriptionStatus;
  trialDays?: number;
  startsAt?: Date;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  pastDueAt?: Date | null;
  graceEndsAt?: Date | null;
  suspendedAt?: Date | null;
}

export interface CreateSubscriptionInvoiceInput {
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  status?: InvoiceStatus;
  currency: string;
  subtotalMinor: bigint;
  discountMinor?: bigint;
  taxMinor?: bigint;
  totalMinor: bigint;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  planCodeSnapshot: string;
  planNameSnapshot: string;
  billingPeriodSnapshot?: string;
  metadata?: Record<string, unknown>;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceMinor: bigint;
    amountMinor: bigint;
    lineType?: "PLAN_CHARGE" | "DISCOUNT" | "TAX" | "ADJUSTMENT";
  }>;
}

export interface RecordStatusHistoryInput {
  subscriptionId: string;
  tenantId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string;
  source: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionRepository {
  findPlanByCode(code: string): Promise<SubscriptionPlan | null>;
  findPlanById(id: string): Promise<SubscriptionPlan | null>;
  listPlans(audience?: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL"): Promise<SubscriptionPlan[]>;
  createPlan(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan>;
  updatePlanPrice(planId: string, newPriceMinor: number): Promise<SubscriptionPlan>;

  findSubscriptionByTenant(tenantId: string): Promise<TenantSubscription | null>;
  findSubscriptionById(id: string): Promise<TenantSubscription | null>;
  createSubscription(input: CreateTenantSubscriptionInput): Promise<TenantSubscription>;
  updateSubscriptionStatus(tenantId: string, status: SubscriptionStatus): Promise<TenantSubscription>;
  updateSubscription(id: string, updates: Partial<TenantSubscriptionProps>): Promise<TenantSubscription>;
  changeSubscriptionPlan(tenantId: string, newPlanId: string): Promise<TenantSubscription>;
  
  listSubscriptionsDueForBilling(asOf: Date): Promise<TenantSubscription[]>;
  listPastDueSubscriptions(asOf: Date): Promise<TenantSubscription[]>;
  listTrialsExpiring(asOf: Date): Promise<TenantSubscription[]>;

  createInvoice(input: CreateSubscriptionInvoiceInput): Promise<SubscriptionInvoice>;
  findInvoiceById(id: string): Promise<SubscriptionInvoice | null>;
  findInvoiceByNumber(invoiceNumber: string): Promise<SubscriptionInvoice | null>;
  findInvoiceBySubscriptionAndPeriod(subscriptionId: string, periodStart: Date, periodEnd: Date): Promise<SubscriptionInvoice | null>;
  listInvoicesByTenant(tenantId: string): Promise<SubscriptionInvoice[]>;
  listOpenInvoices(dueBefore?: Date): Promise<SubscriptionInvoice[]>;
  updateInvoiceStatus(id: string, status: InvoiceStatus, updates?: { paidAt?: Date; voidedAt?: Date }): Promise<SubscriptionInvoice>;

  recordStatusHistory(input: RecordStatusHistoryInput): Promise<SubscriptionStatusHistory>;
  listStatusHistory(subscriptionId: string): Promise<SubscriptionStatusHistory[]>;

  createBillingRun(run: Partial<BillingRunRow>): Promise<BillingRunRow>;
  updateBillingRun(id: string, updates: Partial<BillingRunRow>): Promise<BillingRunRow>;
  findActiveBillingRun(): Promise<BillingRunRow | null>;
}
