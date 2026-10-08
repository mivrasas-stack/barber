import {
  IPaymentProvider,
  PaymentProviderType,
} from "../../domain/payment-provider.interface";
import { WompiPaymentProvider } from "./wompi-payment.provider";
import { TestPaymentProvider } from "./test-payment.provider";

export class PaymentProviderFactory {
  private static testProviderInstance: TestPaymentProvider | null = null;
  private static wompiProviderInstance: WompiPaymentProvider | null = null;

  static getProvider(type: PaymentProviderType): IPaymentProvider {
    switch (type) {
      case "WOMPI":
        if (!this.wompiProviderInstance) {
          this.wompiProviderInstance = new WompiPaymentProvider();
        }
        return this.wompiProviderInstance;

      case "TEST":
        if (process.env.NODE_ENV === "production") {
          throw new Error("TEST payment provider is not permitted in production environment");
        }
        if (!this.testProviderInstance) {
          this.testProviderInstance = new TestPaymentProvider();
        }
        return this.testProviderInstance;

      default:
        throw new Error(`Unsupported payment provider type: ${type}`);
    }
  }

  static getTestProvider(): TestPaymentProvider {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TEST payment provider is not permitted in production environment");
    }
    if (!this.testProviderInstance) {
      this.testProviderInstance = new TestPaymentProvider();
    }
    return this.testProviderInstance;
  }
}
