import { ConflictError } from "@/shared/errors/app-error";

export class InsufficientStockError extends ConflictError {
  constructor(message = "Insufficient stock available for this operation") {
    super(message);
  }
}
