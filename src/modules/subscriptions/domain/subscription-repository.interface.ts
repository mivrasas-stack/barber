import { SubscriptionPlan } from "./subscription-plan";
import { TenantSubscription, SubscriptionStatus } from "./tenant-subscription";

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
}

export interface SubscriptionRepository {
  findPlanByCode(code: string): Promise<SubscriptionPlan | null>;
  findPlanById(id: string): Promise<SubscriptionPlan | null>;
  listPlans(audience?: "BUSINESS" | "SOLO_PROFESSIONAL" | "ALL"): Promise<SubscriptionPlan[]>;
  createPlan(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan>;
  findSubscriptionByTenant(tenantId: string): Promise<TenantSubscription | null>;
  createSubscription(input: CreateTenantSubscriptionInput): Promise<TenantSubscription>;
  updateSubscriptionStatus(tenantId: string, status: SubscriptionStatus): Promise<TenantSubscription>;
  changeSubscriptionPlan(tenantId: string, newPlanId: string): Promise<TenantSubscription>;
}
