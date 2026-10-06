import { UserRepository } from "../domain/user-repository.interface";
import { User } from "../domain/user";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { UnauthenticatedError, ForbiddenError } from "@/shared/errors/app-error";

export interface AuthenticateUserInput {
  email: string;
  password?: string;
}

export class AuthenticateUserUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: AuthenticateUserInput): Promise<User> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthenticatedError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new ForbiddenError(`Account is ${user.status.toLowerCase()}`);
    }

    if (input.password) {
      if (!user.passwordHash) {
        throw new UnauthenticatedError("Password not set for this account");
      }
      const isValid = await PasswordHasher.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new UnauthenticatedError("Invalid email or password");
      }
    }

    await this.userRepo.updateLastLogin(user.id);
    return user;
  }
}
