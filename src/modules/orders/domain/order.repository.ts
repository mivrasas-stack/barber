import { Order, OrderStatus } from "./order";
import { OrderItem } from "./order-item";
import { OrderTender } from "./order-tender";

export interface IOrderRepository {
  findById(id: string, tx?: any): Promise<Order | null>;
  findByOrderNumber(orderNumber: string, tx?: any): Promise<Order | null>;
  findByContext(
    contextTenantId: string,
    options?: {
      locationId?: string;
      status?: OrderStatus;
      customerUserId?: string;
      limit?: number;
      offset?: number;
    },
    tx?: any
  ): Promise<Order[]>;
  save(
    order: Omit<Order, "id" | "createdAt" | "updatedAt" | "items" | "tenders"> & { id?: string },
    items: Array<Omit<OrderItem, "id" | "orderId" | "createdAt"> & { id?: string }>,
    tx?: any
  ): Promise<Order>;
  update(order: Partial<Order> & { id: string }, tx?: any): Promise<Order>;
  addTenders(
    orderId: string,
    tenders: Array<Omit<OrderTender, "id" | "orderId" | "createdAt">>,
    tx?: any
  ): Promise<OrderTender[]>;
}
