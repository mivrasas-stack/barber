export interface InventoryPosition {
  id: string;
  ownerTenantId: string;
  locationId: string;
  productVariantId: string;
  onHand: number;
  reserved: number;
  version: number;
  updatedAt: Date;
}
