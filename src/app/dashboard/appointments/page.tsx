"use client";
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { format } from "date-fns";
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
import { File, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { dummyAppointments } from "../data";
import type { Appointment } from '@/lib/types';
import { AddAppointmentForm } from '@/components/dashboard/AddAppointmentForm';
import { PaymentDialog } from '@/components/dashboard/PaymentDialog';
import { cn } from "@/lib/utils";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(dummyAppointments);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handleOpenForm = (appointment: Appointment | null = null) => {
    setEditingAppointment(appointment);
    setIsFormOpen(true);
  };

  const handleSaveAppointment = (appointmentData: Omit<Appointment, 'id' | 'status'> | Appointment) => {
    if ('id' in appointmentData) {
      // Editing existing appointment
      const updatedAppointments = appointments.map(app => 
        app.id === appointmentData.id ? { ...app, ...appointmentData } : app
      );
      setAppointments(updatedAppointments);
      const dummyIndex = dummyAppointments.findIndex(app => app.id === appointmentData.id);
      if (dummyIndex !== -1) {
          dummyAppointments[dummyIndex] = { ...dummyAppointments[dummyIndex], ...appointmentData };
      }
    } else {
      // Adding new appointment
      const newAppointment = { 
        ...appointmentData, 
        id: `APP${appointments.length + 1}`,
        status: 'Pendiente' as const,
      };
      const updatedAppointments = [...appointments, newAppointment];
      setAppointments(updatedAppointments);
      dummyAppointments.push(newAppointment);
    }
    setIsFormOpen(false);
    setEditingAppointment(null);
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

  const filteredAppointments = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return appointments;
    }
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const from = dateRange.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
      const to = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : null;

      if (from && appointmentDate < from) return false;
      if (to && appointmentDate > to) return false;
      return true;
    });
  }, [appointments, dateRange]);


  const handleExport = () => {
    const dataToExport = filteredAppointments;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Citas");
    XLSX.writeFile(workbook, "citas.xlsx");
  };
  
  const handleClearFilter = () => {
    setDateRange({});
  }

  return (
    <>
      <PageHeader title="Citas">
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Exportar
              </span>
            </Button>
            <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Añadir Cita
              </span>
            </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4 mb-6 p-4 border rounded-lg bg-card">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold text-sm">Filtrar por fecha:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? format(dateRange.from, "PPP") : <span>Desde</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.from}
              onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !dateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.to ? format(dateRange.to, "PPP") : <span>Hasta</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.to}
              onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
              disabled={(date) =>
                dateRange.from ? date < dateRange.from : false
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button onClick={handleClearFilter} variant="ghost" size="sm">
          <X className="h-4 w-4 mr-2" /> Limpiar
        </Button>
      </div>


      <AddAppointmentForm
        isOpen={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setEditingAppointment(null);
        }}
        onSaveAppointment={handleSaveAppointment}
        existingAppointment={editingAppointment}
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
          {filteredAppointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>
                <div className="font-medium">{appointment.customerName}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {appointment.customerEmail}
                </div>
              </TableCell>
              <TableCell>{appointment.service}</TableCell>
              <TableCell>{new Date(appointment.date).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
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
                    <DropdownMenuItem onClick={() => handleOpenForm(appointment)}>Editar</DropdownMenuItem>
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
