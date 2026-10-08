import { OrderItem } from "./order-item";
import { OrderTender } from "./order-tender";

export type OrderStatus = "DRAFT" | "OPEN" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type OrderCollectorParty = "COLLECTED_BY_HOST" | "COLLECTED_BY_PROFESSIONAL";

export interface Order {
  id: string;
  orderNumber: string;
  contextTenantId: string;
  locationId?: string | null;
  customerUserId?: string | null;
  customerNameSnapshot?: string | null;
  customerEmailSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  appointmentId?: string | null;
  status: OrderStatus;
  currency: string;
  subtotalMinor: bigint;
  discountTotalMinor: bigint;
  taxTotalMinor: bigint;
  tipTotalMinor: bigint;
  grandTotalMinor: bigint;
  collectorParty: OrderCollectorParty;
  notes?: string | null;
  createdByUserId?: string | null;
  openedAt: Date;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  tenders: OrderTender[];
}
