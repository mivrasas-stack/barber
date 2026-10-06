"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Scissors, Mail, CheckCircle2, Settings2, CalendarDays, Users, Wallet, Package, BarChart, Lock, UserCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/ui/premium-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const AVAILABLE_MODULES = [
  { id: 'appointments', name: 'Citas', description: 'Gestionar reservas y agenda', icon: <CalendarDays className="w-4 h-4"/> },
  { id: 'customers', name: 'Clientes', description: 'Ver y editar base de clientes', icon: <Users className="w-4 h-4"/> },
  { id: 'finance', name: 'Finanzas & Caja', description: 'Control de ingresos y pagos', icon: <Wallet className="w-4 h-4"/> },
  { id: 'inventory', name: 'Inventario', description: 'Control de productos', icon: <Package className="w-4 h-4"/> },
  { id: 'services', name: 'Servicios', description: 'Catálogo de servicios', icon: <Scissors className="w-4 h-4"/> },
  { id: 'staff', name: 'Personal', description: 'Gestión de equipo y accesos', icon: <UserCog className="w-4 h-4"/> },
  { id: 'admin', name: 'Configuración', description: 'Ajustes del sistema', icon: <Settings2 className="w-4 h-4"/> }
];

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState([
    { id: 1, name: "Carlos Mendoza", role: "Barbero", email: "carlos@barberiaelmaestro.com", status: "Activo", avatar: "CM", permissions: ['appointments', 'customers'] },
    { id: 2, name: "Ana Silva", role: "Recepcionista", email: "recepcion@barberiaelmaestro.com", status: "Activo", avatar: "AS", permissions: ['appointments', 'customers', 'finance', 'inventory', 'services'] },
    { id: 3, name: "David Torres", role: "Barbero", email: "david@barberiaelmaestro.com", status: "Inactivo", avatar: "DT", permissions: ['appointments'] },
    { id: 4, name: "Admin General", role: "Administrador", email: "admin@barberia.com", status: "Activo", avatar: "AD", permissions: AVAILABLE_MODULES.map(m => m.id) },
  ]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: '', 
    password: '',
    permissions: [] as string[]
  });
  const [alert, setAlert] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type }), 3000);
  };

  const openNewStaff = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', role: '', password: '', permissions: [] });
    setIsSheetOpen(true);
  };

  const handleEdit = (staff: any) => {
    setEditingId(staff.id);
    setFormData({
      name: staff.name,
      email: staff.email,
      role: staff.role === 'Recepcionista' ? 'receptionist' : staff.role === 'Administrador' ? 'admin' : 'barber',
      password: '',
      permissions: staff.permissions || []
    });
    setIsSheetOpen(true);
  };

  const handleRoleChange = (role: string) => {
    let defaultPerms: string[] = [];
    if (role === 'barber') {
      defaultPerms = ['appointments', 'customers'];
    } else if (role === 'receptionist') {
      defaultPerms = ['appointments', 'customers', 'finance', 'inventory', 'services'];
    } else if (role === 'admin') {
      defaultPerms = AVAILABLE_MODULES.map(m => m.id);
    }
    setFormData({ ...formData, role, permissions: defaultPerms });
  };

  const togglePermission = (moduleId: string) => {
    setFormData(prev => {
      const current = prev.permissions;
      if (current.includes(moduleId)) {
        return { ...prev, permissions: current.filter(id => id !== moduleId) };
      } else {
        return { ...prev, permissions: [...current, moduleId] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      showAlert('Por favor completa nombre, correo y rol', 'error');
      return;
    }

    const initials = formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const displayRole = formData.role === 'receptionist' ? 'Recepcionista' : formData.role === 'admin' ? 'Administrador' : 'Barbero';

    if (editingId) {
      setStaffList(staffList.map(staff => staff.id === editingId ? { 
        ...staff, 
        name: formData.name, 
        email: formData.email, 
        role: displayRole,
        avatar: initials,
        permissions: formData.permissions
      } : staff));
      showAlert('Empleado actualizado correctamente');
    } else {
      const newStaff = {
        id: Date.now(),
        name: formData.name,
        role: displayRole,
        email: formData.email,
        status: "Activo",
        avatar: initials,
        permissions: formData.permissions
      };
      setStaffList([newStaff, ...staffList]);
      showAlert('Empleado creado exitosamente');
    }
    
    setIsSheetOpen(false);
  };

  const toggleStatus = (id: number) => {
    setStaffList(staffList.map(staff => {
      if (staff.id === id) {
        const newStatus = staff.status === 'Activo' ? 'Inactivo' : 'Activo';
        showAlert(`Acceso ${newStatus === 'Activo' ? 'habilitado' : 'deshabilitado'} para ${staff.name}`, 'success');
        return { ...staff, status: newStatus };
      }
      return staff;
    }));
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 relative bg-background">
      
      {/* Alerta Personalizada */}
      {alert.show && (
        <div className={`fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] px-6 py-4 rounded-2xl border backdrop-blur-xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all animate-in slide-in-from-bottom-8 ${
          alert.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-950/40 border-red-500/30 text-red-400'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
          <span className="font-headline tracking-widest text-sm uppercase mt-0.5">{alert.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Gestión de Personal</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-headline text-foreground tracking-widest uppercase">Equipo de la Barbería</h2>
            <p className="text-muted-foreground font-light tracking-wide mt-2">Crea cuentas, asigna roles y configura permisos de acceso a los módulos.</p>
          </div>
          <PremiumButton onClick={openNewStaff} className="shrink-0 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Nuevo Empleado
          </PremiumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <div key={staff.id} className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 p-6 flex flex-col h-full ${staff.status === 'Inactivo' ? 'bg-background/40 border-border/50 opacity-60' : 'bg-foreground/5 border-border hover:border-primary/30'}`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className={`h-14 w-14 shrink-0 border bg-background ${staff.status === 'Inactivo' ? 'border-border/50' : 'border-primary/20'}`}>
                    <AvatarFallback className={staff.status === 'Inactivo' ? 'bg-foreground/5 text-foreground/40' : 'bg-primary/10 text-primary'}>
                      {staff.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-lg font-headline text-foreground tracking-widest truncate max-w-[180px]">{staff.name}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border inline-block mt-1 ${staff.status === 'Activo' ? 'bg-green-500/5 text-green-500 border-green-500/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                      {staff.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2 text-primary/80 uppercase tracking-widest font-medium text-xs">
                    {staff.role === 'Barbero' ? <Scissors className="w-3.5 h-3.5"/> : staff.role === 'Administrador' ? <Shield className="w-3.5 h-3.5" /> : <UserCog className="w-3.5 h-3.5"/>}
                    {staff.role}
                  </span>
                  <span className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> 
                    <span className="truncate">{staff.email}</span>
                  </span>
                </div>

                {/* Mostrar mini iconos de permisos */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2 font-semibold">Módulos permitidos ({staff.permissions?.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {staff.permissions?.map(perm => {
                      const mod = AVAILABLE_MODULES.find(m => m.id === perm);
                      if (!mod) return null;
                      return (
                        <div key={perm} className="flex items-center justify-center w-7 h-7 rounded bg-foreground/10 text-foreground/70" title={mod.name}>
                          {mod.icon}
                        </div>
                      )
                    })}
                    {(!staff.permissions || staff.permissions.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">Sin accesos</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end mt-6 pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleStatus(staff.id)}
                  className={`flex-1 h-9 px-4 text-xs tracking-wider uppercase bg-transparent border-border hover:bg-foreground/5 transition-all duration-300 ${staff.status === 'Activo' ? 'text-foreground/60 hover:text-red-400 hover:border-red-500/30' : 'text-foreground/60 hover:text-green-400 hover:border-green-500/30'}`}
                >
                  {staff.status === 'Activo' ? 'Suspender' : 'Activar'}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(staff)}
                  className="flex-1 h-9 px-4 text-xs tracking-wider uppercase bg-transparent border-border hover:bg-foreground/5 hover:text-foreground hover:border-primary/30 transition-all duration-300"
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sheet (Drawer) para Formulario */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md bg-background border-l border-border p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-border bg-foreground/5 shrink-0">
            <SheetTitle className="text-xl font-headline tracking-widest uppercase text-primary">
              {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground font-light">
              Configura los datos del empleado y sus permisos de acceso.
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6">
              <form id="staff-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/50 border-b border-border pb-2">Datos Principales</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Nombre Completo</Label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej. Juan Pérez" 
                      className="bg-foreground/5 border-border text-foreground focus-visible:ring-primary/50" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80">Correo Electrónico (Usuario)</Label>
                    <Input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="juan@barberia.com" 
                      className="bg-foreground/5 border-border text-foreground focus-visible:ring-primary/50" 
                    />
                  </div>

                  {!editingId && (
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Contraseña Temporal</Label>
                      <Input 
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="••••••••" 
                        className="bg-foreground/5 border-border text-foreground focus-visible:ring-primary/50" 
                      />
                      <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">El empleado deberá cambiarla al iniciar sesión.</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 pt-2">
                    <Label className="text-foreground/80">Rol Principal</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="bg-foreground/5 border-border text-foreground h-12">
                        <SelectValue placeholder="Seleccionar rol..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border text-foreground z-[100]">
                        <SelectItem value="barber">Barbero</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/50 border-b border-border pb-2 flex items-center justify-between">
                    <span>Permisos de Módulos</span>
                    <Lock className="w-3.5 h-3.5" />
                  </h4>
                  
                  <p className="text-[11px] text-foreground/60 leading-relaxed">
                    Selecciona los módulos a los que este usuario tendrá acceso. 
                    El rol principal preselecciona algunos, pero puedes personalizarlos.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {AVAILABLE_MODULES.map((module) => {
                      const isChecked = formData.permissions.includes(module.id);
                      return (
                        <button
                          type="button"
                          key={module.id} 
                          onClick={() => togglePermission(module.id)}
                          className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all duration-300 text-left ${
                            isChecked 
                              ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                              : 'bg-foreground/5 border-border hover:bg-foreground/10 hover:border-border/80'
                          }`}
                        >
                          <div className={`p-2 rounded-md transition-colors ${isChecked ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-foreground/50'}`}>
                            {module.icon}
                          </div>
                          <div>
                            <p className={`text-sm font-headline tracking-wide ${isChecked ? 'text-primary' : 'text-foreground/80'}`}>
                              {module.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                              {module.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </form>
            </div>
          </ScrollArea>
          
          <SheetFooter className="p-6 border-t border-border bg-background shrink-0">
            <div className="flex gap-3 w-full">
              <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)} className="flex-1 bg-transparent border-border hover:bg-foreground/5">
                Cancelar
              </Button>
              <PremiumButton form="staff-form" type="submit" className="flex-1">
                {editingId ? 'Guardar Cambios' : 'Crear Cuenta'}
              </PremiumButton>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
}
