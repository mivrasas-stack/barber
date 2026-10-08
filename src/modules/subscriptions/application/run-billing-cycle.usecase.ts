import { SubscriptionRepository } from "../domain/subscription-repository.interface";
import { ExpireTrialsUseCase } from "./expire-trials.usecase";
import { GenerateDueInvoicesUseCase } from "./generate-due-invoices.usecase";
import { ProcessSubscriptionLifecycleUseCase } from "./process-subscription-lifecycle.usecase";
import { BillingRunConflictError } from "../domain/subscription-errors";

export interface RunBillingCycleInput {
  asOf?: Date;
  triggeredBy?: string;
  force?: boolean;
}

export interface RunBillingCycleOutput {
  runId: string;
  status: "COMPLETED" | "FAILED";
  startedAt: Date;
  completedAt: Date;
  trialsExpired: number;
  invoicesGenerated: number;
  subscriptionsSuspended: number;
  subscriptionsCancelled: number;
  errors: string[];
}

export class RunBillingCycleUseCase {
  private readonly expireTrialsUseCase: ExpireTrialsUseCase;
  private readonly generateDueInvoicesUseCase: GenerateDueInvoicesUseCase;
  private readonly processLifecycleUseCase: ProcessSubscriptionLifecycleUseCase;

  constructor(private readonly subscriptionRepo: SubscriptionRepository) {
    this.expireTrialsUseCase = new ExpireTrialsUseCase(subscriptionRepo);
    this.generateDueInvoicesUseCase = new GenerateDueInvoicesUseCase(subscriptionRepo);
    this.processLifecycleUseCase = new ProcessSubscriptionLifecycleUseCase(subscriptionRepo);
  }

  async execute(input: RunBillingCycleInput = {}): Promise<RunBillingCycleOutput> {
    const asOf = input.asOf ?? new Date();
    const triggeredBy = input.triggeredBy ?? "SYSTEM";

    // 1. Guard against concurrent billing runs
    const activeRun = await this.subscriptionRepo.findActiveBillingRun();
    if (activeRun && !input.force) {
      throw new BillingRunConflictError(
        `Billing run #${activeRun.id} is currently running since ${activeRun.startedAt?.toISOString()}`
      );
    }

    // 2. Register run start
    const runRecord = await this.subscriptionRepo.createBillingRun({
      status: "RUNNING",
      triggeredByUserId: triggeredBy.startsWith("ADMIN:") ? triggeredBy.replace("ADMIN:", "") : null,
      startedAt: new Date(),
    });

    const errors: string[] = [];
    let trialsExpired = 0;
    let invoicesGenerated = 0;
    let subscriptionsSuspended = 0;
    let subscriptionsCancelled = 0;

    try {
      // Step A: Expire trials
      try {
        const trialsResult = await this.expireTrialsUseCase.execute({ asOf });
        trialsExpired = trialsResult.expiredCount;
      } catch (err: any) {
        errors.push(`Trial expiration step failed: ${err.message}`);
      }

      // Step B: Generate due invoices
      try {
        const invoiceResult = await this.generateDueInvoicesUseCase.execute({ asOf });
        invoicesGenerated = invoiceResult.generatedCount;
      } catch (err: any) {
        errors.push(`Invoice generation step failed: ${err.message}`);
      }

      // Step C: Dunning, grace periods, and scheduled cancellations
      try {
        const lifecycleResult = await this.processLifecycleUseCase.execute({ asOf });
        subscriptionsSuspended = lifecycleResult.suspendedCount;
        subscriptionsCancelled = lifecycleResult.cancelledCount;
      } catch (err: any) {
        errors.push(`Lifecycle processing step failed: ${err.message}`);
      }

      const completedAt = new Date();
      await this.subscriptionRepo.updateBillingRun(runRecord.id, {
        status: "COMPLETED",
        completedAt,
        tenantsProcessed: trialsExpired + invoicesGenerated + subscriptionsSuspended,
        invoicesCreated: invoicesGenerated,
        errorsCount: errors.length,
        summary: {
          trialsExpired,
          invoicesGenerated,
          subscriptionsSuspended,
          subscriptionsCancelled,
          errors,
        },
      });

      return {
        runId: runRecord.id,
        status: "COMPLETED",
        startedAt: runRecord.startedAt,
        completedAt,
        trialsExpired,
        invoicesGenerated,
        subscriptionsSuspended,
        subscriptionsCancelled,
        errors,
      };
    } catch (criticalErr: any) {
      const completedAt = new Date();
      errors.push(`Critical failure in billing cycle: ${criticalErr.message}`);

      await this.subscriptionRepo.updateBillingRun(runRecord.id, {
        status: "FAILED",
        completedAt,
        errorsCount: errors.length,
        summary: { errors },
      });

      return {
        runId: runRecord.id,
        status: "FAILED",
        startedAt: runRecord.startedAt,
        completedAt,
        trialsExpired,
        invoicesGenerated,
        subscriptionsSuspended,
        subscriptionsCancelled,
        errors,
      };
    }
  }
}
