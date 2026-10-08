/**
 * Barber Paradise v2 - Billing Policy Constants & Configurations
 */
export interface BillingPolicyConfig {
  gracePeriodDays: number;
  maxPaymentAttempts: number;
  suspendAfterPastDueDays: number;
  invoiceDueDays: number;
  retryScheduleDays: number[];
  defaultTrialDays: number;
}

export const DEFAULT_BILLING_POLICY: BillingPolicyConfig = {
  gracePeriodDays: 3,
  maxPaymentAttempts: 4,
  suspendAfterPastDueDays: 7,
  invoiceDueDays: 0, // Invoices due on billing period start
  retryScheduleDays: [0, 1, 3, 7],
  defaultTrialDays: 14,
};
