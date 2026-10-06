"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Building,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MoneyDto {
  amountMinor: number;
  currency: string;
  formatted: string;
}

interface AccountBalanceDto {
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debitTotal: MoneyDto;
  creditTotal: MoneyDto;
  netBalance: MoneyDto;
}

interface FinancialSummaryDto {
  tenantId: string;
  currency: string;
  totalRevenue: MoneyDto;
  totalExpenses: MoneyDto;
  netIncome: MoneyDto;
  totalCash: MoneyDto;
  totalReceivables: MoneyDto;
  totalPayables: MoneyDto;
  accountBalances: AccountBalanceDto[];
}

interface JournalLineDto {
  id?: string;
  financialAccountId: string;
  direction: "DEBIT" | "CREDIT";
  amount: MoneyDto;
  memo?: string;
}

interface JournalEntryDto {
  id: string;
  entryNumber: string;
  entryType: string;
  currency: string;
  sourceType: string;
  sourceId?: string;
  description: string;
  status: "POSTED" | "REVERSED";
  occurredAt: string;
  postedAt: string;
  reversedEntryId?: string;
  reversalOfEntryId?: string;
  totalAmount: MoneyDto;
  lines: JournalLineDto[];
}

interface ExpenseDto {
  id: string;
  tenantId: string;
  categoryId?: string;
  description: string;
  amount: MoneyDto;
  incurredAt: string;
  status: "POSTED" | "REVERSED";
  vendorName?: string;
  receiptMediaId?: string;
  journalEntryId?: string;
  createdAt: string;
}

interface SettlementDto {
  id: string;
  fromTenantId: string;
  toTenantId: string;
  affiliationId?: string;
  currency: string;
  amount: MoneyDto;
  status: string;
  settlementType: string;
  reference?: string;
  notes?: string;
  confirmedAt?: string;
  createdAt: string;
}

export default function ProfessionalFinancePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<FinancialSummaryDto | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<JournalEntryDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [settlements, setSettlements] = useState<SettlementDto[]>([]);

  // Dialog States
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseVendor, setNewExpenseVendor] = useState("");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [selectedEntryForLines, setSelectedEntryForLines] = useState<JournalEntryDto | null>(null);

  const loadAllFinancialData = useCallback(async () => {
    try {
      setError(null);
      const [sumRes, ledRes, expRes, setRes] = await Promise.all([
        fetch("/api/v1/finance/summary"),
        fetch("/api/v1/finance/ledger"),
        fetch("/api/v1/finance/expenses"),
        fetch("/api/v1/finance/settlements"),
      ]);

      if (!sumRes.ok) throw new Error("Error loading financial summary");
      const sumJson = await sumRes.json();
      setSummary(sumJson.data);

      if (ledRes.ok) {
        const ledJson = await ledRes.json();
        setLedgerEntries(ledJson.data?.entries || []);
      }

      if (expRes.ok) {
        const expJson = await expRes.json();
        setExpenses(expJson.data?.expenses || []);
      }

      if (setRes.ok) {
        const setJson = await setRes.json();
        setSettlements(setJson.data?.settlements || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de conexión";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllFinancialData();
  }, [loadAllFinancialData]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseDesc || !newExpenseAmount) return;

    try {
      setSubmittingExpense(true);
      const parsedAmount = Math.round(parseFloat(newExpenseAmount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert("Ingrese un monto válido mayor a 0");
        return;
      }

      const res = await fetch("/api/v1/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newExpenseDesc,
          amountMinor: parsedAmount,
          vendorName: newExpenseVendor || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo registrar el gasto");
      }

      setIsExpenseDialogOpen(false);
      setNewExpenseDesc("");
      setNewExpenseAmount("");
      setNewExpenseVendor("");
      loadAllFinancialData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al registrar gasto");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleReverseExpense = async (expenseId: string) => {
    const reason = prompt("Ingrese el motivo de la anulación del gasto:", "Error de digitación");
    if (!reason) return;

    try {
      const res = await fetch(`/api/v1/finance/expenses/${expenseId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "No se pudo anular el gasto");
      }

      loadAllFinancialData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al anular");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Cargando libro contable y saldos derivados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-headline font-bold text-foreground">
              Finanzas & Contabilidad Transaccional
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-mono">
              PARTIDA DOBLE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sistema contable inmutable de doble entrada. Todos los saldos son derivados matemáticamente del libro mayor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadAllFinancialData();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setIsExpenseDialogOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Ingresos Totales</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">
              {summary?.totalRevenue.formatted ?? "$0 COP"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Servicios realizados & Propinas</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Gastos Operativos</span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-rose-400">
              {summary?.totalExpenses.formatted ?? "$0 COP"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Insumos, comisiones pagadas & fijos</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Utilidad Neta</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-foreground">
              {summary?.netIncome.formatted ?? "$0 COP"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Ingresos menos egresos reales</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Saldo en Caja</span>
              <Wallet className="w-4 h-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-sky-400">
              {summary?.totalCash.formatted ?? "$0 COP"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Disponible físico / bancario</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-KPIs: Receivables & Payables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cuentas por Cobrar (Activos)</p>
              <p className="text-base font-mono font-bold text-foreground">
                {summary?.totalReceivables.formatted ?? "$0 COP"}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Pendiente de cobro a clientes / sedes</span>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cuentas por Pagar (Pasivos)</p>
              <p className="text-base font-mono font-bold text-foreground">
                {summary?.totalPayables.formatted ?? "$0 COP"}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Pendiente de liquidación a anfitriones</span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border/40">
          <TabsTrigger value="overview" className="text-xs">
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Plan de Cuentas
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Libro Mayor ({ledgerEntries.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">
            <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
            Gastos ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="settlements" className="text-xs">
            <Building className="w-3.5 h-3.5 mr-1.5" />
            Liquidaciones ({settlements.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Chart of Accounts Overview */}
        <TabsContent value="overview">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Saldos Derivados por Cuenta Contable</CardTitle>
              <CardDescription className="text-xs">
                Cálculo en tiempo real acumulando Débitos y Créditos según la naturaleza de cada cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Nombre de Cuenta</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Naturaleza</TableHead>
                    <TableHead className="text-xs text-right">Total Débitos</TableHead>
                    <TableHead className="text-xs text-right">Total Créditos</TableHead>
                    <TableHead className="text-xs text-right">Saldo Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.accountBalances.map((acc) => (
                    <TableRow key={acc.accountCode} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {acc.accountCode}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {acc.accountName}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {acc.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-[11px]">
                        {acc.normalBalance}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {acc.debitTotal.formatted}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {acc.creditTotal.formatted}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right font-bold text-foreground">
                        {acc.netBalance.formatted}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!summary?.accountBalances || summary.accountBalances.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        No hay movimientos registrados todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Journal Entries Ledger */}
        <TabsContent value="ledger">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Asientos Contables (Partida Doble)</CardTitle>
              <CardDescription className="text-xs">
                Asientos inmutables. Cada registro garantiza rigurosamente Σ(Débitos) = Σ(Créditos).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">N° Asiento</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Monto Total</TableHead>
                    <TableHead className="text-xs text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((je) => (
                    <TableRow key={je.id} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-foreground font-semibold">
                        {je.entryNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(je.occurredAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {je.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {je.description}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          className={
                            je.status === "POSTED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]"
                          }
                        >
                          {je.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right font-bold text-foreground">
                        {je.totalAmount.formatted}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setSelectedEntryForLines(je)}
                        >
                          Ver Líneas ({je.lines.length})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledgerEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        No hay asientos contables registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Expenses */}
        <TabsContent value="expenses">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Registro de Gastos Operativos</CardTitle>
                <CardDescription className="text-xs">
                  Gastos registrados con impacto directo en caja y cuenta de egresos.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsExpenseDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Nuevo Gasto
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Proveedor</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(exp.incurredAt).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {exp.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {exp.vendorName || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          className={
                            exp.status === "POSTED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]"
                          }
                        >
                          {exp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right font-bold text-rose-400">
                        {exp.amount.formatted}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {exp.status === "POSTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-rose-400 hover:text-rose-300"
                            onClick={() => handleReverseExpense(exp.id)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Anular
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        No hay gastos operativos registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Settlements */}
        <TabsContent value="settlements">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Liquidaciones y Acuerdos de Pago</CardTitle>
              <CardDescription className="text-xs">
                Transferencias registradas entre sedes anfitrionas y profesionales independientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Referencia / Notas</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Monto Liquidado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((st) => (
                    <TableRow key={st.id} className="border-border/40 hover:bg-muted/20">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(st.createdAt).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {st.settlementType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {st.reference || st.notes || "Liquidación periódica"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          {st.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right font-bold text-foreground">
                        {st.amount.formatted}
                      </TableCell>
                    </TableRow>
                  ))}
                  {settlements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        No hay liquidaciones registradas en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Crear Gasto */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registrar Gasto Operativo</DialogTitle>
            <DialogDescription className="text-xs">
              Registra un egreso que afectará el saldo de caja y el libro mayor contable en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción del Gasto *</Label>
              <Input
                placeholder="Ej. Hojas de afeitar y toallas desechables"
                value={newExpenseDesc}
                onChange={(e) => setNewExpenseDesc(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Monto en COP *</Label>
              <Input
                type="number"
                placeholder="Ej. 45000"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Proveedor (Opcional)</Label>
              <Input
                placeholder="Ej. Distribuidora Central de Barbería"
                value={newExpenseVendor}
                onChange={(e) => setNewExpenseVendor(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExpenseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingExpense}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingExpense ? "Registrando..." : "Guardar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Líneas de Asiento Contable */}
      <Dialog
        open={Boolean(selectedEntryForLines)}
        onOpenChange={(open) => !open && setSelectedEntryForLines(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Líneas del Asiento {selectedEntryForLines?.entryNumber}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {selectedEntryForLines?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedEntryForLines?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs">Dirección</TableHead>
                  <TableHead className="text-xs">Cuenta / Memo</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedEntryForLines?.lines.map((line, idx) => (
                  <TableRow key={idx} className="border-border/40">
                    <TableCell className="text-xs">
                      <Badge
                        className={
                          line.direction === "DEBIT"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                        }
                      >
                        {line.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <span className="font-mono text-muted-foreground block text-[11px]">
                        ID Cuenta: {line.financialAccountId.slice(0, 8)}...
                      </span>
                      {line.memo || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-right font-bold text-foreground">
                      {line.amount.formatted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedEntryForLines(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
