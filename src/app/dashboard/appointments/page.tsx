"use client";
import React, { useState } from 'react';
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
import type { Appointment } from '@/lib/types';
import { AddAppointmentForm } from '@/components/dashboard/AddAppointmentForm';
import { PaymentDialog } from '@/components/dashboard/PaymentDialog';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(dummyAppointments);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleAddAppointment = (newAppointment: Omit<Appointment, 'id' | 'status'>) => {
    const appointmentWithId = { 
      ...newAppointment, 
      id: `APP${appointments.length + 1}`,
      status: 'Pendiente' as const,
    };
    const updatedAppointments = [...appointments, appointmentWithId];
    setAppointments(updatedAppointments);
    dummyAppointments.push(appointmentWithId);
    setIsFormOpen(false);
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    const updatedAppointments = appointments.map(app => 
      app.id === id ? { ...app, status } : app
    );
    setAppointments(updatedAppointments);
    const dummyIndex = dummyAppointments.findIndex(app => app.id === id);
    if (dummyIndex !== -1) {
        dummyAppointments[dummyIndex].status = status;
    }
  };

  const handleOpenPaymentDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (selectedAppointment) {
      updateAppointmentStatus(selectedAppointment.id, 'Pagada');
    }
    setIsPaymentDialogOpen(false);
    setSelectedAppointment(null);
  };


  return (
    <>
      <PageHeader title="Citas">
        <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Cita
          </span>
        </Button>
      </PageHeader>

      <AddAppointmentForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onAddAppointment={handleAddAppointment}
      />

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        onConfirm={handleConfirmPayment}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
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
                    appointment.status === 'Pagada' ? 'default' :
                    appointment.status === 'Completada' ? 'default' :
                    appointment.status === 'Confirmada' ? 'secondary':
                    appointment.status === 'Cancelada' ? 'destructive' :
                    'outline'
                  }
                  className={
                    appointment.status === 'Confirmada' ? 'bg-green-600/20 text-green-400 border-green-600/40' : 
                    appointment.status === 'Pagada' ? 'bg-green-500 text-primary-foreground' : ''
                }
                >
                  {appointment.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={appointment.status === 'Pagada'}>
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment.id, 'Confirmada')}>Confirmar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenPaymentDialog(appointment)}>Proceder al pago</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => updateAppointmentStatus(appointment.id, 'Cancelada')}>Cancelar</DropdownMenuItem>
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
