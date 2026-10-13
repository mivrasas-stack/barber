import { UserId } from "@/modules/identity/domain/user";
import { TenantId } from "@/modules/tenancy/domain/tenant";

export interface UserMembershipSummary {
  membershipId: string;
  tenantId: TenantId;
  tenantName: string;
  tenantSlug: string;
  tenantType: "BUSINESS" | "SOLO_PROFESSIONAL";
  status: string;
  roles: string[];
}

export interface AuthorizationContextProps {
  userId: UserId;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  memberships: UserMembershipSummary[];
  activeTenantId?: TenantId | null;
  activeRoles: string[];
  activePermissions: string[];
}

export class AuthorizationContext {
  constructor(private readonly props: AuthorizationContextProps) {}

  get userId(): UserId {
    return this.props.userId;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get isPlatformAdmin(): boolean {
    return this.props.isPlatformAdmin;
  }

  get memberships(): UserMembershipSummary[] {
    return this.props.memberships;
  }

  get activeTenantId(): TenantId | null | undefined {
    return this.props.activeTenantId;
  }

  get activeRoles(): string[] {
    return this.props.activeRoles;
  }

  get activePermissions(): string[] {
    return this.props.activePermissions;
  }

  hasPermission(permissionCode: string): boolean {
    if (this.props.isPlatformAdmin) return true;
    return this.props.activePermissions.includes(permissionCode);
  }

  hasRole(roleName: string): boolean {
    if (this.props.isPlatformAdmin && roleName === "PLATFORM_ADMIN") return true;
    return this.props.activeRoles.includes(roleName);
  }

  get activeTenant(): UserMembershipSummary | null {
    if (!this.props.activeTenantId) return null;
    return this.props.memberships.find((m) => m.tenantId === this.props.activeTenantId) ?? null;
  }

  isSoloProfessional(): boolean {
    const active = this.activeTenant;
    if (active) {
      return active.tenantType === "SOLO_PROFESSIONAL";
    }
    return this.props.memberships.some((m) => m.tenantType === "SOLO_PROFESSIONAL" && m.status === "ACTIVE");
  }

  isOwner(): boolean {
    return this.hasRole("OWNER");
  }

  isEmployee(): boolean {
    return this.hasRole("EMPLOYEE") || this.hasRole("OWNER") || this.hasRole("MANAGER");
  }
}
