import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { dummyCustomers } from "../data";

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="Clientes" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo Electrónico</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Citas</TableHead>
            <TableHead>Total Gastado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dummyCustomers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>{customer.totalAppointments}</TableCell>
              <TableCell>${customer.totalSpent.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
