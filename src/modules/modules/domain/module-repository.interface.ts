import { Module } from "./module";

export interface ModuleRepository {
  listAllModules(): Promise<Module[]>;
  findByCode(code: string): Promise<Module | null>;
  findById(id: string): Promise<Module | null>;
  createModule(module: Omit<Module, "id"> & { id?: string }): Promise<Module>;
  listPlanModules(planId: string): Promise<string[]>; // Returns moduleIds
  assignPlanModule(planId: string, moduleId: string): Promise<void>;
  listModuleDependencies(): Promise<{ moduleId: string; requiredModuleId: string }[]>;
  addModuleDependency(moduleId: string, requiredModuleId: string): Promise<void>;
  listTenantOverrides(tenantId: string): Promise<{
    moduleId: string;
    state: "FORCE_ENABLED" | "FORCE_DISABLED";
    reason?: string | null;
  }[]>;
  setTenantOverride(
    tenantId: string,
    moduleId: string,
    state: "FORCE_ENABLED" | "FORCE_DISABLED",
    reason?: string,
    userId?: string
  ): Promise<void>;
  removeTenantOverride(tenantId: string, moduleId: string): Promise<void>;
}
