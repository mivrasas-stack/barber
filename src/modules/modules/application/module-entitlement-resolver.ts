import { ModuleRepository } from "../domain/module-repository.interface";
import { SubscriptionRepository } from "@/modules/subscriptions/domain/subscription-repository.interface";
import { EffectiveModule, Module } from "../domain/module";
import { ForbiddenError } from "@/shared/errors/app-error";

export class ModuleEntitlementResolver {
  constructor(
    private readonly moduleRepo: ModuleRepository,
    private readonly subscriptionRepo: SubscriptionRepository
  ) {}

  async resolveEffectiveModules(tenantId: string): Promise<EffectiveModule[]> {
    const allModules = await this.moduleRepo.listAllModules();
    const subscription = await this.subscriptionRepo.findSubscriptionByTenant(tenantId);

    // 1. If no subscription or subscription is suspended/cancelled
    if (!subscription || !subscription.isOperational) {
      return allModules.map((m) => ({
        module: m,
        isEnabled: false,
        source: "SUBSCRIPTION_REQUIRED",
        reason: subscription
          ? `Subscription is ${subscription.status}`
          : "No active subscription found",
      }));
    }

    // 2. Fetch plan modules, overrides, and dependencies
    const [planModuleIds, overrides, dependencies] = await Promise.all([
      this.moduleRepo.listPlanModules(subscription.planId),
      this.moduleRepo.listTenantOverrides(tenantId),
      this.moduleRepo.listModuleDependencies(),
    ]);

    const overrideMap = new Map(overrides.map((o) => [o.moduleId, o]));
    const planModuleSet = new Set(planModuleIds);

    // 3. First pass: Plan vs Override vs Availability
    const intermediate = new Map<string, { isEnabled: boolean; source: any; reason?: string }>();

    for (const m of allModules) {
      if (!m.isAvailable) {
        intermediate.set(m.id, {
          isEnabled: false,
          source: "UNAVAILABLE",
          reason: m.status === "COMING_SOON" ? "Próximamente disponible" : "Módulo no disponible",
        });
        continue;
      }

      const override = overrideMap.get(m.id);
      if (override) {
        if (override.state === "FORCE_DISABLED") {
          intermediate.set(m.id, {
            isEnabled: false,
            source: "DISABLED_BY_ADMIN",
            reason: override.reason ?? "Deshabilitado por administración",
          });
          continue;
        }
        if (override.state === "FORCE_ENABLED") {
          intermediate.set(m.id, {
            isEnabled: true,
            source: "ADMIN_OVERRIDE",
            reason: override.reason ?? "Habilitado por administración",
          });
          continue;
        }
      }

      if (planModuleSet.has(m.id)) {
        intermediate.set(m.id, {
          isEnabled: true,
          source: "PLAN",
        });
      } else {
        intermediate.set(m.id, {
          isEnabled: false,
          source: "PLAN",
          reason: "No incluido en el plan actual",
        });
      }
    }

    // 4. Second pass: Enforce dependencies
    for (const m of allModules) {
      const current = intermediate.get(m.id)!;
      if (!current.isEnabled) continue;

      const requiredDeps = dependencies.filter((d) => d.moduleId === m.id);
      for (const req of requiredDeps) {
        const reqState = intermediate.get(req.requiredModuleId);
        if (!reqState || !reqState.isEnabled) {
          intermediate.set(m.id, {
            isEnabled: false,
            source: "DEPENDENCY_MISSING",
            reason: "Requiere dependencias que no están habilitadas",
          });
          break;
        }
      }
    }

    return allModules.map((m) => {
      const resolved = intermediate.get(m.id)!;
      return {
        module: m,
        isEnabled: resolved.isEnabled,
        source: resolved.source,
        reason: resolved.reason,
      };
    });
  }

  async isModuleEnabled(tenantId: string, moduleCode: string): Promise<boolean> {
    const effective = await this.resolveEffectiveModules(tenantId);
    const found = effective.find((e) => e.module.code === moduleCode);
    return found ? found.isEnabled : false;
  }

  async assertTenantModuleEnabled(tenantId: string, moduleCode: string): Promise<void> {
    const isEnabled = await this.isModuleEnabled(tenantId, moduleCode);
    if (!isEnabled) {
      throw new ForbiddenError(
        `MODULE_NOT_ENTITLED: Module '${moduleCode}' is not enabled or not entitled for workspace '${tenantId}'`
      );
    }
  }
}
