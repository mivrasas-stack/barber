import { eq, and } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import {
  modules,
  planModules,
  moduleDependencies,
  tenantModuleOverrides,
  ModuleRow,
} from "@/infrastructure/database/schema/modules";
import { Module } from "../domain/module";
import { ModuleRepository } from "../domain/module-repository.interface";

export class DrizzleModuleRepository implements ModuleRepository {
  private toDomain(row: ModuleRow): Module {
    return new Module({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category as any,
      status: row.status as any,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async listAllModules(): Promise<Module[]> {
    const rows = await db.select().from(modules).orderBy(modules.sortOrder);
    return rows.map((r) => this.toDomain(r));
  }

  async findByCode(code: string): Promise<Module | null> {
    const rows = await db
      .select()
      .from(modules)
      .where(eq(modules.code, code))
      .limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async findById(id: string): Promise<Module | null> {
    const rows = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);
    if (!rows[0]) return null;
    return this.toDomain(rows[0]);
  }

  async createModule(data: any): Promise<Module> {
    const [row] = await db
      .insert(modules)
      .values({
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category ?? "CORE",
        status: data.status ?? "AVAILABLE",
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return this.toDomain(row);
  }

  async listPlanModules(planId: string): Promise<string[]> {
    const rows = await db
      .select({ moduleId: planModules.moduleId })
      .from(planModules)
      .where(eq(planModules.planId, planId));
    return rows.map((r) => r.moduleId);
  }

  async assignPlanModule(planId: string, moduleId: string): Promise<void> {
    await db
      .insert(planModules)
      .values({ planId, moduleId })
      .onConflictDoNothing();
  }

  async listModuleDependencies(): Promise<{ moduleId: string; requiredModuleId: string }[]> {
    const rows = await db.select().from(moduleDependencies);
    return rows.map((r) => ({
      moduleId: r.moduleId,
      requiredModuleId: r.requiredModuleId,
    }));
  }

  async addModuleDependency(moduleId: string, requiredModuleId: string): Promise<void> {
    await db
      .insert(moduleDependencies)
      .values({ moduleId, requiredModuleId })
      .onConflictDoNothing();
  }

  async listTenantOverrides(tenantId: string): Promise<{
    moduleId: string;
    state: "FORCE_ENABLED" | "FORCE_DISABLED";
    reason?: string | null;
  }[]> {
    const rows = await db
      .select()
      .from(tenantModuleOverrides)
      .where(eq(tenantModuleOverrides.tenantId, tenantId));
    return rows.map((r) => ({
      moduleId: r.moduleId,
      state: r.state as "FORCE_ENABLED" | "FORCE_DISABLED",
      reason: r.reason,
    }));
  }

  async setTenantOverride(
    tenantId: string,
    moduleId: string,
    state: "FORCE_ENABLED" | "FORCE_DISABLED",
    reason?: string,
    userId?: string
  ): Promise<void> {
    await db
      .insert(tenantModuleOverrides)
      .values({
        tenantId,
        moduleId,
        state,
        reason,
        createdByUserId: userId,
      })
      .onConflictDoUpdate({
        target: [tenantModuleOverrides.tenantId, tenantModuleOverrides.moduleId],
        set: {
          state,
          reason,
          createdByUserId: userId,
          updatedAt: new Date(),
        },
      });
  }

  async removeTenantOverride(tenantId: string, moduleId: string): Promise<void> {
    await db
      .delete(tenantModuleOverrides)
      .where(
        and(
          eq(tenantModuleOverrides.tenantId, tenantId),
          eq(tenantModuleOverrides.moduleId, moduleId)
        )
      );
  }
}
