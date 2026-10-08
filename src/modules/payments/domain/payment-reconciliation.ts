import { PaymentProviderType } from "./payment-provider.interface";

export type ReconciliationStatus =
  | "MATCHED"
  | "STATUS_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "MISSING_PROVIDER_PAYMENT"
  | "MISSING_INTERNAL_PAYMENT"
  | "REFUND_MISMATCH";

export interface PaymentReconciliationProps {
  id?: string;
  paymentIntentId: string;
  provider: PaymentProviderType;
  providerTransactionId?: string | null;
  reconciliationStatus: ReconciliationStatus;
  internalStatus: string;
  providerStatus?: string | null;
  internalAmountMinor: bigint;
  providerAmountMinor?: bigint | null;
  discrepancyDetails?: Record<string, unknown> | null;
  reconciledByUserId?: string | null;
  createdAt?: Date;
}

export class PaymentReconciliation {
  readonly id?: string;
  readonly paymentIntentId: string;
  readonly provider: PaymentProviderType;
  readonly providerTransactionId?: string | null;
  readonly reconciliationStatus: ReconciliationStatus;
  readonly internalStatus: string;
  readonly providerStatus?: string | null;
  readonly internalAmountMinor: bigint;
  readonly providerAmountMinor?: bigint | null;
  readonly discrepancyDetails?: Record<string, unknown> | null;
  readonly reconciledByUserId?: string | null;
  readonly createdAt: Date;

  constructor(props: PaymentReconciliationProps) {
    this.id = props.id;
    this.paymentIntentId = props.paymentIntentId;
    this.provider = props.provider;
    this.providerTransactionId = props.providerTransactionId;
    this.reconciliationStatus = props.reconciliationStatus;
    this.internalStatus = props.internalStatus;
    this.providerStatus = props.providerStatus;
    this.internalAmountMinor = props.internalAmountMinor;
    this.providerAmountMinor = props.providerAmountMinor;
    this.discrepancyDetails = props.discrepancyDetails;
    this.reconciledByUserId = props.reconciledByUserId;
    this.createdAt = props.createdAt ?? new Date();
  }
}
