import { AuthorizationContext } from "./authorization-context";

export interface CreateMembershipInput {
  tenantId: string;
  userId: string;
  roleNames: string[];
}

export interface AuthorizationRepository {
  createMembership(input: CreateMembershipInput): Promise<string>;
  getAuthorizationContext(userId: string, targetTenantId?: string): Promise<AuthorizationContext | null>;
}
