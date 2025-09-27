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
import { dummyAppointments } from "../data";

export default function AppointmentsPage() {
  return (
    <>
      <PageHeader title="Appointments">
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Appointment
          </span>
        </Button>
      </PageHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dummyAppointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>
                <div className="font-medium">{appointment.customerName}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {appointment.customerEmail}
                </div>
              </TableCell>
              <TableCell>{appointment.service}</TableCell>
              <TableCell>{appointment.date}</TableCell>
              <TableCell>
                <Badge 
                  variant={
                    appointment.status === 'Completed' ? 'default' :
                    appointment.status === 'Confirmed' ? 'secondary':
                    appointment.status === 'Cancelled' ? 'destructive' :
                    'outline'
                  }
                  className={appointment.status === 'Confirmed' ? 'bg-green-600/20 text-green-400 border-green-600/40' : ''}
                >
                  {appointment.status}
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
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Confirm</DropdownMenuItem>
                    <DropdownMenuItem>Cancel</DropdownMenuItem>
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
