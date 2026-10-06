import bcrypt from "bcryptjs";

export class PasswordHasher {
  private static readonly SALT_ROUNDS = 10;

  static async hash(plain: string): Promise<string> {
    return await bcrypt.hash(plain, this.SALT_ROUNDS);
  }

  static async compare(plain: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plain, hash);
  }
}
