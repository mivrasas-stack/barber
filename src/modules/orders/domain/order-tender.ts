export type OrderTenderMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "EXTERNAL_CARD"
  | "NEQUI"
  | "DAVIPLATA"
  | "OTHER"
  | "UNPAID";

export interface OrderTender {
  id: string;
  orderId: string;
  method: OrderTenderMethod;
  amountMinor: bigint;
  amountReceivedMinor?: bigint | null;
  changeDueMinor?: bigint | null;
  currency: string;
  reference?: string | null;
  declaredByUserId?: string | null;
  createdAt: Date;
}
