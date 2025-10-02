"use client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dummyAppointments, dummyBarbers } from "@/app/dashboard/data"
import { CancelAppointmentDialog } from "./CancelAppointmentDialog"
import { useState } from "react"
import type { Appointment } from "@/lib/types"
import { BookAppointmentForm } from "./BookAppointmentForm"

export function UserAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(dummyAppointments.filter(a => a.customerName === "John Doe"));
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCancelAppointment = (appointmentId: string) => {
    const updatedAppointments = appointments.map(app => 
        app.id === appointmentId ? { ...app, status: 'Cancelada' as const } : app
    );
    setAppointments(updatedAppointments);

    const dummyIndex = dummyAppointments.findIndex(app => app.id === appointmentId);
    if (dummyIndex !== -1) {
        dummyAppointments[dummyIndex].status = 'Cancelada';
    }
  };
  
  const handleSaveAppointment = (appointmentData: Omit<Appointment, 'id'| 'status' | 'customerName' | 'customerEmail'>) => {
    const newAppointment: Appointment = {
      id: `APP${dummyAppointments.length + 1}`,
      customerName: "John Doe",
      customerEmail: "john.d@example.com",
      status: "Pendiente",
      ...appointmentData
    };
    setAppointments(prev => [...prev, newAppointment]);
    dummyAppointments.push(newAppointment);
    setIsFormOpen(false);
  }

  const getBarberById = (barberId: string) => {
    return dummyBarbers.find(b => b.id === barberId);
  }

  return (
    <>
    <BookAppointmentForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaveAppointment={handleSaveAppointment}
    />
    <Card>
      <CardHeader>
        <CardTitle>Mis Citas</CardTitle>
        <CardDescription>Aquí puedes ver tu historial de citas y gestionar las próximas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map(appointment => {
          const barber = getBarberById(appointment.barberId);
          return (
            <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-semibold">{appointment.service}</p>
                <p className="text-sm text-muted-foreground">{new Date(appointment.date).toLocaleString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                 <p className="text-xs text-muted-foreground mt-1">Con: {barber?.name || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2">
                  <Badge 
                    variant={
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
                  {appointment.status === "Confirmada" && (
                      <CancelAppointmentDialog onConfirm={() => handleCancelAppointment(appointment.id)} />
                  )}
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={() => setIsFormOpen(true)}>Agendar Nueva Cita</Button>
      </CardFooter>
    </Card>
    </>
  )
}
