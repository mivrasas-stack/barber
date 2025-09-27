import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { File, PlusCircle } from "lucide-react";
import { dummyTransactions } from "../data";

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
          {dummyTransactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date}</TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>
                <Badge variant={transaction.type === 'Ingreso' ? 'secondary' : 'destructive'}>
                  {transaction.type}
                </Badge>
              </TableCell>
              <TableCell className={`text-right font-medium ${transaction.type === 'Ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                {transaction.type === 'Ingreso' ? '+' : '-'}${transaction.amount.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
