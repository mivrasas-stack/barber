export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";

export type NormalBalance = "DEBIT" | "CREDIT";

export const STANDARD_ACCOUNT_CODES = {
  // Assets (1000 - 1999)
  CASH: "1010_CASH",
  ACCOUNTS_RECEIVABLE: "1020_ACCOUNTS_RECEIVABLE",
  HOST_COMMISSION_RECEIVABLE: "1030_HOST_COMMISSION_RECEIVABLE",
  HOST_CHAIR_RENT_RECEIVABLE: "1040_HOST_CHAIR_RENT_RECEIVABLE",

  // Liabilities (2000 - 2999)
  ACCOUNTS_PAYABLE: "2010_ACCOUNTS_PAYABLE",
  PROFESSIONAL_COMMISSION_PAYABLE: "2020_PROFESSIONAL_COMMISSION_PAYABLE",
  HOST_COMMISSION_PAYABLE: "2030_HOST_COMMISSION_PAYABLE",
  HOST_CHAIR_RENT_PAYABLE: "2040_HOST_CHAIR_RENT_PAYABLE",
  TIPS_PAYABLE: "2050_TIPS_PAYABLE",
  SETTLEMENT_CLEARING: "2099_SETTLEMENT_CLEARING",

  // Equity (3000 - 3999)
  RETAINED_EARNINGS: "3010_RETAINED_EARNINGS",

  // Revenue (4000 - 4999)
  SERVICE_REVENUE: "4010_SERVICE_REVENUE",
  COMMISSION_REVENUE: "4020_COMMISSION_REVENUE",
  CHAIR_RENT_REVENUE: "4030_CHAIR_RENT_REVENUE",
  TIP_REVENUE: "4040_TIP_REVENUE",

  // Expenses (5000 - 5999)
  COMMISSION_EXPENSE: "5010_COMMISSION_EXPENSE",
  CHAIR_RENT_EXPENSE: "5020_CHAIR_RENT_EXPENSE",
  OPERATING_EXPENSE: "5030_OPERATING_EXPENSE",
} as const;

export type StandardAccountCode = (typeof STANDARD_ACCOUNT_CODES)[keyof typeof STANDARD_ACCOUNT_CODES];

export interface FinancialAccountProps {
  id: string;
  tenantId: string | null;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FinancialAccount {
  readonly id: string;
  readonly tenantId: string | null;
  readonly accountCode: string;
  readonly accountName: string;
  readonly accountType: AccountType;
  readonly currency: string;
  readonly status: AccountStatus;
  readonly isSystem: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: FinancialAccountProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.accountCode = props.accountCode;
    this.accountName = props.accountName;
    this.accountType = props.accountType;
    this.currency = props.currency;
    this.status = props.status;
    this.isSystem = props.isSystem;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  get normalBalance(): NormalBalance {
    switch (this.accountType) {
      case "ASSET":
      case "EXPENSE":
        return "DEBIT";
      case "LIABILITY":
      case "EQUITY":
      case "REVENUE":
        return "CREDIT";
    }
  }

  isActive(): boolean {
    return this.status === "ACTIVE";
  }
}
