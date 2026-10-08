export type InventoryReservationStatus =
  | "ACTIVE"
  | "CONVERTED"
  | "RELEASED"
  | "EXPIRED";

export interface InventoryReservationProps {
  id?: string;
  paymentIntentId: string;
  orderId: string;
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  quantity: number;
  status?: InventoryReservationStatus;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class InventoryReservation {
  readonly id?: string;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly ownerTenantId: string;
  readonly locationId: string;
  readonly productVariantId: string;
  readonly quantity: number;
  private _status: InventoryReservationStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: InventoryReservationProps) {
    this.id = props.id;
    this.paymentIntentId = props.paymentIntentId;
    this.orderId = props.orderId;
    this.ownerTenantId = props.ownerTenantId;
    this.locationId = props.locationId;
    this.productVariantId = props.productVariantId;
    this.quantity = props.quantity;
    this._status = props.status ?? "ACTIVE";
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get status(): InventoryReservationStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  markConverted(): void {
    this._status = "CONVERTED";
    this._updatedAt = new Date();
  }

  markReleased(): void {
    this._status = "RELEASED";
    this._updatedAt = new Date();
  }

  markExpired(): void {
    this._status = "EXPIRED";
    this._updatedAt = new Date();
  }
}
