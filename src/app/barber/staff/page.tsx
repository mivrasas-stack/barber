"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Scissors, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/premium-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function StaffManagementPage() {
  const staffMembers = [
    { id: 1, name: "Carlos Mendoza", role: "Barbero", email: "carlos@barberiaelmaestro.com", status: "Activo", avatar: "CM" },
    { id: 2, name: "Ana Silva", role: "Recepcionista", email: "recepcion@barberiaelmaestro.com", status: "Activo", avatar: "AS" },
    { id: 3, name: "David Torres", role: "Barbero", email: "david@barberiaelmaestro.com", status: "Inactivo", avatar: "DT" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Gestión de Personal</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-6xl">
        <div className="mb-12">
          <h2 className="text-3xl font-headline text-white tracking-widest uppercase">Equipo de la Barbería</h2>
          <p className="text-muted-foreground font-light tracking-wide mt-2">Crea cuentas para tu equipo y asígnales roles (Barbero, Recepcionista).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Listado de Empleados */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-headline tracking-widest text-white uppercase flex items-center gap-2">
                <UsersIcon className="text-primary w-5 h-5"/> Empleados Registrados
              </h3>
            </div>
            
            <div className="space-y-4">
              {staffMembers.map((staff) => (
                <div key={staff.id} className="group relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all duration-300 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <Avatar className="h-14 w-14 border border-primary/20 bg-background">
                      <AvatarFallback className="bg-primary/10 text-primary">{staff.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-lg font-headline text-white tracking-widest">{staff.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Mail className="w-3 h-3" /> {staff.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
                    <div className="flex flex-col items-start sm:items-end w-full">
                      <div className="flex items-center gap-1 text-primary text-sm uppercase tracking-widest font-medium">
                        {staff.role === 'Barbero' ? <Scissors className="w-4 h-4"/> : <Shield className="w-4 h-4"/>}
                        {staff.role}
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full ${staff.status === 'Activo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {staff.status}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex border-white/10 hover:bg-white/5 hover:text-white">
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de Creación */}
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl h-fit sticky top-32">
            <h3 className="text-xl font-headline tracking-widest text-white uppercase flex items-center gap-2 mb-6">
              <UserPlus className="text-primary w-5 h-5"/> Nuevo Empleado
            </h3>
            
            <form className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white/60">Nombre Completo</Label>
                <Input placeholder="Ej. Juan Pérez" className="bg-white/5 border-white/10 text-white focus-visible:ring-primary/50" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Correo Electrónico (Usuario)</Label>
                <Input type="email" placeholder="juan@barberia.com" className="bg-white/5 border-white/10 text-white focus-visible:ring-primary/50" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Rol en la Barbería</Label>
                <Select>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-white">
                    <SelectItem value="barber">Barbero</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Contraseña Temporal</Label>
                <Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 text-white focus-visible:ring-primary/50" />
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">El empleado podrá cambiarla al iniciar sesión.</p>
              </div>

              <PremiumButton className="w-full pt-4">
                Crear Cuenta de Empleado
              </PremiumButton>
            </form>
          </div>
          
        </div>
      </main>
    </div>
  );
}

// Pequeño icono helper
function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
