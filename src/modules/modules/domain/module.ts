export type ModuleCategory =
  | "CORE"
  | "SCHEDULING"
  | "CUSTOMERS"
  | "PROFILE"
  | "OPERATIONS"
  | "FINANCE"
  | "ANALYTICS"
  | "AI";

export type ModuleStatus = "AVAILABLE" | "COMING_SOON" | "INTERNAL" | "DEPRECATED";

export interface ModuleProps {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: ModuleCategory;
  status: ModuleStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export const MANDATORY_CORE_MODULES = [
  "core.dashboard",
  "scheduling.calendar",
  "scheduling.appointments",
  "scheduling.availability",
  "catalog.services",
];

export class Module {
  constructor(private readonly props: ModuleProps) {}

  get id(): string { return this.props.id; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null | undefined { return this.props.description; }
  get category(): ModuleCategory { return this.props.category; }
  get status(): ModuleStatus { return this.props.status; }
  get sortOrder(): number { return this.props.sortOrder; }

  get isAvailable(): boolean {
    return this.props.status === "AVAILABLE";
  }

  get isMandatoryCore(): boolean {
    return MANDATORY_CORE_MODULES.includes(this.props.code);
  }
}

export type EntitlementSource =
  | "PLAN"
  | "ADMIN_OVERRIDE"
  | "DISABLED_BY_ADMIN"
  | "UNAVAILABLE"
  | "DEPENDENCY_MISSING"
  | "SUBSCRIPTION_REQUIRED";

export interface EffectiveModule {
  module: Module;
  isEnabled: boolean;
  source: EntitlementSource;
  reason?: string;
}
