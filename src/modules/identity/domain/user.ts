export type UserId = string;
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface UserProps {
  id: UserId;
  email: string;
  emailNormalized: string;
  name: string;
  passwordHash?: string | null;
  emailVerifiedAt?: Date | null;
  status: UserStatus;
  isPlatformAdmin: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): UserId {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get emailNormalized(): string {
    return this.props.emailNormalized;
  }

  get name(): string {
    return this.props.name;
  }

  get passwordHash(): string | null | undefined {
    return this.props.passwordHash;
  }

  get isPlatformAdmin(): boolean {
    return this.props.isPlatformAdmin;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static normalizeEmail(rawEmail: string): string {
    return rawEmail.trim().toLowerCase();
  }
}
