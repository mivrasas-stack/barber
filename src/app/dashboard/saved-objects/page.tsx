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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { dummySavedObjects } from "../data";

export default function SavedObjectsPage() {
  return (
    <>
      <PageHeader title="Guardar Objetos">
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Objeto
          </span>
        </Button>
      </PageHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Objeto</TableHead>
            <TableHead>Fecha de Entrega</TableHead>
            <TableHead>Fecha de Devolución</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dummySavedObjects.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.customerName}</TableCell>
              <TableCell>{item.objectName}</TableCell>
              <TableCell>{item.dateStored}</TableCell>
              <TableCell>{item.dateReturned || 'N/A'}</TableCell>
              <TableCell>
                <Badge 
                  variant={
                    item.status === 'Guardado' ? 'secondary' : 'default'
                  }
                  className={item.status === 'Guardado' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40' : ''}
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem>Marcar como Devuelto</DropdownMenuItem>
                    <DropdownMenuItem>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
