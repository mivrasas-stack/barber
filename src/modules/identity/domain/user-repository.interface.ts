import { User, UserId } from "./user";

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash?: string;
  isPlatformAdmin?: boolean;
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  updateLastLogin(id: UserId): Promise<void>;
}
