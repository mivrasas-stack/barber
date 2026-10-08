import { PaymentProviderType } from "./payment-provider.interface";

export type WebhookProcessingStatus =
  | "RECEIVED"
  | "PROCESSED"
  | "IGNORED_DUPLICATE"
  | "FAILED";

export interface PaymentWebhookEventProps {
  id?: string;
  provider: PaymentProviderType;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  signatureValid: boolean;
  processingStatus?: WebhookProcessingStatus;
  errorCode?: string | null;
  receivedAt?: Date;
  processedAt?: Date | null;
}

export class PaymentWebhookEvent {
  readonly id?: string;
  readonly provider: PaymentProviderType;
  readonly providerEventId: string;
  readonly eventType: string;
  readonly payloadHash: string;
  readonly signatureValid: boolean;
  private _processingStatus: WebhookProcessingStatus;
  private _errorCode?: string | null;
  readonly receivedAt: Date;
  private _processedAt?: Date | null;

  constructor(props: PaymentWebhookEventProps) {
    this.id = props.id;
    this.provider = props.provider;
    this.providerEventId = props.providerEventId;
    this.eventType = props.eventType;
    this.payloadHash = props.payloadHash;
    this.signatureValid = props.signatureValid;
    this._processingStatus = props.processingStatus ?? "RECEIVED";
    this._errorCode = props.errorCode;
    this.receivedAt = props.receivedAt ?? new Date();
    this._processedAt = props.processedAt;
  }

  get processingStatus(): WebhookProcessingStatus {
    return this._processingStatus;
  }

  get errorCode(): string | null | undefined {
    return this._errorCode;
  }

  get processedAt(): Date | null | undefined {
    return this._processedAt;
  }

  markProcessed(): void {
    this._processingStatus = "PROCESSED";
    this._processedAt = new Date();
  }

  markIgnoredDuplicate(): void {
    this._processingStatus = "IGNORED_DUPLICATE";
    this._processedAt = new Date();
  }

  markFailed(errorCode: string): void {
    this._processingStatus = "FAILED";
    this._errorCode = errorCode;
    this._processedAt = new Date();
  }
}
