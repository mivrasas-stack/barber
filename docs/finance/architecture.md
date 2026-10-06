# Financial Core Architecture — Barber Paradise v2 (Stage 3A)

## 1. Architectural Mission & Philosophy
The Financial Core answers mathematically, auditably, and reproducibly:
> **"¿De quién es cada peso y por qué?"**

Key foundations:
- **Append-Only Double-Entry General Ledger**: Every movement requires balanced journal entries satisfying $\sum(\text{DEBITS}) = \sum(\text{CREDITS})$.
- **Zero Mutable Balance Columns**: No `balance` column exists in the database. All account balances and financial summaries are derived dynamically from posted journal lines.
- **Pure PostgreSQL Authority**: Strong consistency ensures that appointment completion and financialization succeed or fail together inside a single ACID transaction.

---

## 2. Transaction Flow & Collection Semantics

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Cliente
    actor FrontDesk as Host Front Desk / Barber
    participant ApptRepo as DrizzleAppointmentRepository
    participant PostRev as PostServiceRevenueUseCase
    participant SettlePolicy as SettlementPolicy
    participant FinRepo as DrizzleFinanceRepository
    participant DB as PostgreSQL 16

    Customer->>FrontDesk: Pago por Servicio ($100k) + Propina ($10k)
    FrontDesk->>ApptRepo: Marcar Cita como COMPLETED
    activate ApptRepo
    ApptRepo->>DB: BEGIN TRANSACTION
    ApptRepo->>DB: UPDATE appointments SET status='COMPLETED'
    ApptRepo->>PostRev: execute(appointmentId, collectorParty, tx)
    activate PostRev
    PostRev->>DB: SELECT appointment, snapshot services, affiliation terms
    PostRev->>SettlePolicy: calculateServiceBreakdown(...)
    activate SettlePolicy
    SettlePolicy-->>PostRev: Breakdown (Gross, Tip, Commission, Shares)
    deactivate SettlePolicy
    
    alt COLLECTED_BY_HOST
        PostRev->>FinRepo: Post Host Entry (DEBIT Cash, CREDIT Comm Rev, CREDIT Pro Payable, CREDIT Tip Payable)
        PostRev->>FinRepo: Post Solo Pro Entry (DEBIT Host Receivable, DEBIT Comm Exp, CREDIT Rev, CREDIT Tip)
    else COLLECTED_BY_PROFESSIONAL
        PostRev->>FinRepo: Post Solo Pro Entry (DEBIT Cash, CREDIT Rev, CREDIT Tip, DEBIT Comm Exp, CREDIT Host Payable)
        PostRev->>FinRepo: Post Host Entry (DEBIT Host Receivable, CREDIT Comm Rev)
    end
    
    FinRepo->>DB: INSERT journal_entries, journal_lines
    deactivate PostRev
    ApptRepo->>DB: INSERT outbox_events, audit_logs
    ApptRepo->>DB: COMMIT TRANSACTION
    deactivate ApptRepo
```

---

## 3. Financial Entity Relationship Diagram

```mermaid
erDiagram
    tenants ||--o{ financial_accounts : "owns"
    tenants ||--o{ journal_entries : "scopes"
    tenants ||--o{ journal_lines : "associates"
    tenants ||--o{ expenses : "incurs"
    tenants ||--o{ settlements : "from / to"
    
    journal_entries ||--|{ journal_lines : "contains (>=2)"
    financial_accounts ||--o{ journal_lines : "referenced by"
    
    expenses ||--o| journal_entries : "generates"
    settlements ||--o| journal_entries : "generates"
    appointments ||--o| journal_entries : "financialized as"

    financial_accounts {
        uuid id PK
        uuid tenant_id FK
        varchar account_code
        varchar account_name
        varchar account_type
        char currency
        varchar status
        boolean is_system
    }

    journal_entries {
        uuid id PK
        uuid tenant_id FK
        varchar entry_number
        varchar entry_type
        char currency
        varchar source_type
        uuid source_id
        text description
        varchar status
        timestamp occurred_at
        timestamp posted_at
        uuid reversed_entry_id
        uuid reversal_of_entry_id
    }

    journal_lines {
        uuid id PK
        uuid journal_entry_id FK
        uuid financial_account_id FK
        uuid tenant_id FK
        varchar direction
        bigint amount_minor
        text memo
    }

    expenses {
        uuid id PK
        uuid tenant_id FK
        uuid category_id FK
        text description
        bigint amount_minor
        char currency
        varchar status
        uuid journal_entry_id FK
    }

    settlements {
        uuid id PK
        uuid from_tenant_id FK
        uuid to_tenant_id FK
        uuid affiliation_id FK
        bigint amount_minor
        char currency
        varchar status
        varchar settlement_type
        uuid journal_entry_id FK
    }
```

---

## 4. Standard Chart of Accounts (Plan Único de Cuentas)

| Código | Nombre de Cuenta | Clasificación | Naturaleza Normal |
| :--- | :--- | :--- | :--- |
| `1010_CASH` | Caja General y Bancos | ASSET | **DEBIT** |
| `1020_ACCOUNTS_RECEIVABLE` | Cuentas por Cobrar Clientes | ASSET | **DEBIT** |
| `1030_HOST_COMMISSION_RECEIVABLE` | Comisión por Cobrar a Profesional | ASSET | **DEBIT** |
| `1040_HOST_CHAIR_RENT_RECEIVABLE` | Alquiler de Silla por Cobrar | ASSET | **DEBIT** |
| `2010_ACCOUNTS_PAYABLE` | Cuentas por Pagar Proveedores | LIABILITY | **CREDIT** |
| `2020_PROFESSIONAL_COMMISSION_PAYABLE`| Comisión por Pagar a Profesional | LIABILITY | **CREDIT** |
| `2030_HOST_COMMISSION_PAYABLE` | Comisión por Pagar a Anfitrión | LIABILITY | **CREDIT** |
| `2040_HOST_CHAIR_RENT_PAYABLE` | Alquiler de Silla por Pagar | LIABILITY | **CREDIT** |
| `2050_TIPS_PAYABLE` | Propinas por Pagar | LIABILITY | **CREDIT** |
| `2099_SETTLEMENT_CLEARING` | Cuenta Puente de Liquidaciones | LIABILITY | **CREDIT** |
| `3010_RETAINED_EARNINGS` | Utilidades Retenidas / Capital | EQUITY | **CREDIT** |
| `4010_SERVICE_REVENUE` | Ingresos por Prestación de Servicios | REVENUE | **CREDIT** |
| `4020_COMMISSION_REVENUE` | Ingresos por Comisión de Sede | REVENUE | **CREDIT** |
| `4030_CHAIR_RENT_REVENUE` | Ingresos por Alquiler de Silla | REVENUE | **CREDIT** |
| `4040_TIP_REVENUE` | Ingresos por Propinas | REVENUE | **CREDIT** |
| `5010_COMMISSION_EXPENSE` | Gastos por Comisión de Sede | EXPENSE | **DEBIT** |
| `5020_CHAIR_RENT_EXPENSE` | Gastos por Alquiler de Silla | EXPENSE | **DEBIT** |
| `5030_OPERATING_EXPENSE` | Gastos Operativos Generales | EXPENSE | **DEBIT** |

---

## 5. Summary Balance Derivation Rules
$$
\text{Saldo}(\text{ASSET, EXPENSE}) = \sum \text{DEBITS} - \sum \text{CREDITS}
$$
$$
\text{Saldo}(\text{LIABILITY, EQUITY, REVENUE}) = \sum \text{CREDITS} - \sum \text{DEBITS}
$$
$$
\text{Utilidad Neta} = \text{Ingresos Totales} - \text{Gastos Totales}
$$
