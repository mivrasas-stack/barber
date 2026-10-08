import { IOrderRepository } from "../domain/order.repository";
import { Order } from "../domain/order";

export class CancelOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed order. Use refund instead.");
    }

    if (order.status === "CANCELLED") {
      return order;
    }

    return await this.orderRepository.update({
      id: orderId,
      status: "CANCELLED",
      cancelledAt: new Date(),
      version: order.version + 1,
    });
  }
}
