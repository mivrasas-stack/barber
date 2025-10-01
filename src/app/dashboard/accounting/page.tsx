import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { File, PlusCircle } from "lucide-react";
import { dummyTransactions, serviceTransactions, productTransactions, waitingRoomTransactions } from "../data";
import type { Transaction } from "@/lib/types";

const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date}</TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>
                <Badge variant={transaction.type === 'Ingreso' ? 'secondary' : 'destructive'}>
                  {transaction.type}
                </Badge>
              </TableCell>
              <TableCell className={`text-right font-medium ${transaction.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                {transaction.type === 'Ingreso' ? '+' : '-'}COP {transaction.amount.toLocaleString('es-CO')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
);


export default function AccountingPage() {
  return (
    <>
      <PageHeader title="Contabilidad">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Añadir Transacción
            </span>
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="waiting-room">Sala de Espera</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
            <TransactionTable transactions={dummyTransactions} />
        </TabsContent>
        <TabsContent value="services" className="mt-6">
            <TransactionTable transactions={serviceTransactions} />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
            <TransactionTable transactions={productTransactions} />
        </TabsContent>
        <TabsContent value="waiting-room" className="mt-6">
            <TransactionTable transactions={waitingRoomTransactions} />
        </TabsContent>
      </Tabs>
    </>
  );
}
