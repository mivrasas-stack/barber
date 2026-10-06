import { CurrencyMismatchError, InvalidFinancialAmountError } from "./finance-errors";

export type RoundingMode = "HALF_UP" | "FLOOR" | "CEIL";

export class Money {
  readonly amountMinor: bigint;
  readonly currency: string;

  constructor(amountMinor: bigint | number, currency = "COP") {
    const parsedAmount =
      typeof amountMinor === "number"
        ? BigInt(Math.round(amountMinor))
        : amountMinor;
    this.amountMinor = parsedAmount;
    this.currency = currency.toUpperCase().trim();
  }

  static fromMinor(amount: bigint | number, currency = "COP"): Money {
    return new Money(amount, currency);
  }

  static zero(currency = "COP"): Money {
    return new Money(BigInt(0), currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(
        `Cannot operate on mismatched currencies: ${this.currency} vs ${other.currency}`
      );
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  plus(other: Money): Money {
    return this.add(other);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  minus(other: Money): Money {
    return this.subtract(other);
  }

  /**
   * Deterministically calculates basis points (10000 bp = 100.00%)
   * Example: 100000 COP * 2000 bp = 20000 COP
   */
  multiplyBasisPoints(
    basisPoints: number,
    roundingMode: RoundingMode = "HALF_UP"
  ): Money {
    if (basisPoints < 0) {
      throw new InvalidFinancialAmountError("Basis points cannot be negative");
    }
    const bpBig = BigInt(Math.round(basisPoints));
    const numerator = this.amountMinor * bpBig;
    const divisor = BigInt(10000);

    const quotient = numerator / divisor;
    const remainder = numerator % divisor;

    let result = quotient;
    if (roundingMode === "HALF_UP") {
      // BigInt(5000) is half of BigInt(10000)
      if (remainder >= BigInt(5000)) {
        result += BigInt(1);
      }
    } else if (roundingMode === "CEIL") {
      if (remainder > BigInt(0)) {
        result += BigInt(1);
      }
    }
    // "FLOOR" truncates by default

    return new Money(result, this.currency);
  }

  isZero(): boolean {
    return this.amountMinor === BigInt(0);
  }

  isPositive(): boolean {
    return this.amountMinor > BigInt(0);
  }

  isNegative(): boolean {
    return this.amountMinor < BigInt(0);
  }

  equals(other: Money): boolean {
    return (
      this.currency === other.currency &&
      this.amountMinor === other.amountMinor
    );
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor > other.amountMinor;
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor >= other.amountMinor;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor < other.amountMinor;
  }

  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor <= other.amountMinor;
  }

  get minorUnitsString(): string {
    return this.amountMinor.toString();
  }

  toAmountNumber(): number {
    return Number(this.amountMinor);
  }

  format(): string {
    const isSafe =
      this.amountMinor <= BigInt(Number.MAX_SAFE_INTEGER) &&
      this.amountMinor >= BigInt(-Number.MAX_SAFE_INTEGER);
    if (isSafe) {
      const num = Number(this.amountMinor);
      if (this.currency === "COP") {
        return `$${num.toLocaleString("es-CO")} COP`;
      }
      if (this.currency === "USD") {
        return `$${(num / 100).toFixed(2)} USD`;
      }
      return `${num.toLocaleString()} ${this.currency}`;
    }
    return `${this.amountMinor.toString()} ${this.currency}`;
  }

  toFormattedString(): string {
    return this.format();
  }

  toJSON() {
    const isSafe =
      this.amountMinor <= BigInt(Number.MAX_SAFE_INTEGER) &&
      this.amountMinor >= BigInt(-Number.MAX_SAFE_INTEGER);
    return {
      amountMinor: isSafe ? Number(this.amountMinor) : this.amountMinor.toString(),
      amountMinorStr: this.amountMinor.toString(),
      currency: this.currency,
      formatted: this.format(),
    };
  }

  toString(): string {
    return this.format();
  }
}
