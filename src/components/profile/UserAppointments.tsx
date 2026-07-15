"use client"
import { Badge } from "@/components/ui/badge"
import { dummyAppointments, dummyBarbers } from "@/app/dashboard/data"
import { CancelAppointmentDialog } from "./CancelAppointmentDialog"
import { useState } from "react"
import type { Appointment } from "@/lib/types"
import { BookAppointmentForm } from "./BookAppointmentForm"
import { PremiumButton } from "@/components/ui/premium-button"
import { Calendar, Clock, User } from "lucide-react"

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-headline text-white tracking-wide">HISTORIAL DE CITAS</h2>
          <p className="text-muted-foreground font-light mt-1">Gestiona tus próximas experiencias en BarberParadise.</p>
        </div>
        <PremiumButton onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto min-w-[200px]">
            Agendar Nueva Cita
        </PremiumButton>
      </div>
      
      <div className="grid gap-6">
        {appointments.length === 0 ? (
          <p className="text-muted-foreground italic">No tienes citas registradas aún.</p>
        ) : (
          appointments.map(appointment => {
            const barber = getBarberById(appointment.barberId);
            const appDate = new Date(appointment.date);
            
            return (
              <div key={appointment.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-none bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 gap-6">
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 md:items-center flex-1">
                    <div className="min-w-[150px]">
                        <p className="text-primary font-medium tracking-[0.2em] uppercase text-xs mb-1">
                            {appointment.id}
                        </p>
                        <p className="text-xl font-headline text-white tracking-wide">{appointment.service}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-light">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-white/40" />
                            <span>{appDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-white/40" />
                            <span>{appDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-white/40" />
                            <span>{barber?.name || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-t border-white/5 pt-4 md:border-0 md:pt-0">
                    <Badge 
                      variant={
                        appointment.status === 'Completada' ? 'default' :
                        appointment.status === 'Confirmada' ? 'secondary':
                        appointment.status === 'Cancelada' ? 'destructive' :
                        'outline'
                      }
                      className={
                        appointment.status === 'Confirmada' ? 'bg-primary/20 text-primary border border-primary/50 rounded-full font-light tracking-wider uppercase text-xs py-1 px-3' : 
                        appointment.status === 'Completada' || appointment.status === 'Pagada' ? 'bg-white/10 text-white border border-white/20 rounded-full font-light tracking-wider uppercase text-xs py-1 px-3' : 
                        appointment.status === 'Cancelada' ? 'bg-red-950 text-red-400 border border-red-900 rounded-full font-light tracking-wider uppercase text-xs py-1 px-3' :
                        'bg-transparent text-muted-foreground border border-white/10 rounded-full font-light tracking-wider uppercase text-xs py-1 px-3'
                    }
                    >
                      {appointment.status}
                    </Badge>
                    {appointment.status === "Confirmada" && (
                        <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <CancelAppointmentDialog onConfirm={() => handleCancelAppointment(appointment.id)} />
                        </div>
                    )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
    </>
  )
}
