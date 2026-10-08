# Payment Provider Integration & Wompi Adapter Guide

## Supported Providers
1. **Wompi (`WOMPI`)**:
   - Production gateway for Colombian cards, Nequi, Bancolombia transfer, PSE.
   - Uses Wompi API v1 transaction endpoints.
   - Cryptographic transaction integrity signature generation:
     $$\text{hash} = \text{SHA256}(\text{reference} + \text{amountInCents} + \text{currency} + \text{integritySecret})$$
   - Webhook validation signature verification:
     $$\text{hash} = \text{SHA256}(\text{transaction.id} + \text{transaction.status} + \text{transaction.amount\_in\_cents} + \text{timestamp} + \text{eventsSecret})$$
2. **Test Provider (`TEST`)**:
   - Deterministic in-memory / mock adapter for automated end-to-end and concurrency testing.
   - Supports failure simulation, synthetic webhook generation, and simulated network timeouts.

## Factory & Provider Port
All providers implement the `IPaymentProvider` contract in `src/modules/payments/domain/payment-provider.interface.ts`:
```typescript
export interface IPaymentProvider {
  createTransaction(intent: PaymentIntent): Promise<ProviderTransactionResult>;
  verifyWebhook(payload: Record<string, any>, signature: string, headers: Record<string, string>): Promise<boolean>;
  queryTransaction(providerTransactionId: string): Promise<ProviderTransactionQuery>;
  requestRefund(providerTransactionId: string, amountMinor: bigint, reason: string): Promise<ProviderRefundResult>;
}
```

The factory in `src/modules/payments/infrastructure/providers/payment-provider.factory.ts` instantiates the appropriate adapter based on intent parameters or environment configurations.
