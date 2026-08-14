"use client"
import { Badge } from "@/components/ui/badge"
import { dummyAppointments, dummyBarbers } from "@/app/clientes/data"
import { CancelAppointmentDialog } from "./CancelAppointmentDialog"
import { useState } from "react"
import type { Appointment } from "@/lib/types"
import { BookAppointmentForm } from "./BookAppointmentForm"
import { PremiumButton } from "@/components/ui/premium-button"
import { Calendar, Clock, User, ArrowRight, MapPin } from "lucide-react"

export function UserAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>(
    dummyAppointments.filter(a => a.customerName === "John Doe").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );
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
    setAppointments(prev => [newAppointment, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    dummyAppointments.push(newAppointment);
    setIsFormOpen(false);
  }

  const getBarberById = (barberId: string) => {
    return dummyBarbers.find(b => b.id === barberId);
  }

  const upcomingAppointment = appointments.find(a => a.status === 'Confirmada' || a.status === 'Pendiente');
  const pastAppointments = appointments.filter(a => a.id !== upcomingAppointment?.id);

  return (
    <>
    <BookAppointmentForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaveAppointment={handleSaveAppointment}
    />
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-headline text-white tracking-widest uppercase">MIS CITAS</h2>
          <p className="text-muted-foreground font-light mt-1">Gestiona tus próximas experiencias en BarberParadise.</p>
        </div>
        <PremiumButton onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto min-w-[200px]">
            Agendar Nueva Cita
        </PremiumButton>
      </div>

      {upcomingAppointment && (
        <div className="space-y-4">
          <h3 className="text-sm font-headline tracking-[0.2em] text-primary uppercase">Próxima Experiencia</h3>
          <div className="relative overflow-hidden bg-white/5 border border-white/10 p-8 md:p-10 backdrop-blur-md group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${upcomingAppointment.status === 'Confirmada' ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${upcomingAppointment.status === 'Confirmada' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    </span>
                    <span className="text-xs uppercase tracking-widest text-white/60">{upcomingAppointment.status}</span>
                  </div>
                  <h4 className="text-4xl md:text-5xl font-headline text-white tracking-wide">{upcomingAppointment.service}</h4>
                  <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mt-2">
                    {upcomingAppointment.id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-white/80 font-light">
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{new Date(upcomingAppointment.date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{new Date(upcomingAppointment.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <User className="w-4 h-4 text-primary" />
                        <span>{getBarberById(upcomingAppointment.barberId)?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Cra 15 # 85-20, Zona T</span>
                    </div>
                </div>
              </div>
              
              {upcomingAppointment.status === "Confirmada" && (
                  <div className="w-full lg:w-auto border-t border-white/10 pt-6 lg:border-t-0 lg:pt-0 lg:pl-6 lg:border-l">
                      <CancelAppointmentDialog onConfirm={() => handleCancelAppointment(upcomingAppointment.id)} />
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {pastAppointments.length > 0 && <h3 className="text-sm font-headline tracking-[0.2em] text-white/40 uppercase">Historial</h3>}
        <div className="grid gap-4">
          {appointments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 bg-white/[0.02]">
              <p className="text-muted-foreground italic mb-4">No tienes citas registradas aún.</p>
              <PremiumButton onClick={() => setIsFormOpen(true)} variant="outline">Reservar Ahora</PremiumButton>
            </div>
          ) : (
            pastAppointments.map(appointment => {
              const barber = getBarberById(appointment.barberId);
              const appDate = new Date(appointment.date);
              
              return (
                <div key={appointment.id} className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-none bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-300 gap-6">
                  
                  <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-center flex-1">
                      <div className="min-w-[150px]">
                          <p className="text-primary/70 font-medium tracking-[0.2em] uppercase text-[10px] mb-1">
                              {appointment.id}
                          </p>
                          <p className="text-lg font-headline text-white/90 tracking-wide">{appointment.service}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-light">
                          <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-white/30" />
                              <span>{appDate.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-white/30" />
                              <span>{appDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-white/30" />
                              <span>{barber?.name || 'N/A'}</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 border-t border-white/5 pt-4 md:border-0 md:pt-0">
                      <Badge 
                        variant="outline"
                        className={
                          appointment.status === 'Completada' || appointment.status === 'Pagada' ? 'bg-white/5 text-white/70 border-white/10 rounded-full font-light tracking-wider uppercase text-[10px] py-1 px-3' : 
                          appointment.status === 'Cancelada' ? 'bg-red-950/30 text-red-400/70 border-red-900/50 rounded-full font-light tracking-wider uppercase text-[10px] py-1 px-3' :
                          'bg-transparent text-muted-foreground border-white/10 rounded-full font-light tracking-wider uppercase text-[10px] py-1 px-3'
                      }
                      >
                        {appointment.status}
                      </Badge>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
    </>
  )
}

