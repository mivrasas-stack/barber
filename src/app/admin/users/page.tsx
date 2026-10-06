"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, MoreHorizontal, UserPlus, ShieldAlert, CheckCircle2, Clock, Copy, Edit, Trash2, Key, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

const initialUsersData = [
  { id: 1, name: 'Administrador Principal', email: 'admin@mivra.com', role: 'SuperAdmin', status: 'Active', lastLogin: 'Hace 2 horas' },
  { id: 2, name: 'Soporte Técnico', email: 'support@mivra.com', role: 'Support', status: 'Active', lastLogin: 'Hace 5 horas' },
  { id: 3, name: 'Auditor Financiero', email: 'audit@mivra.com', role: 'Admin', status: 'Inactive', lastLogin: 'Hace 3 días' },
  { id: 4, name: 'Gestor de Franquicias', email: 'franchise@mivra.com', role: 'Admin', status: 'Active', lastLogin: 'Hace 1 hora' },
];

function InviteUserModal() {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (name || idNumber) {
      const baseName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const generatedUser = idNumber ? `${baseName}${idNumber.slice(-4)}` : baseName;
      setUsername(generatedUser || 'usuario...');
      
      if (idNumber.length >= 4 && name.length >= 2) {
         setPassword(`Mivra${idNumber.slice(0, 4)}*`);
      } else {
         setPassword('Mivra****');
      }
    } else {
      setUsername('');
      setPassword('');
    }
  }, [name, idNumber]);

  const handleCopy = () => {
    const text = `Usuario: ${username}\nContraseña: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndInvite = async () => {
    if (!name || !idNumber || !phone) {
      alert("Por favor, completa todos los campos (Nombre, Cédula y WhatsApp).");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Aquí iría la lógica para guardar el usuario en la base de datos
      console.log("Guardando usuario:", { name, idNumber, phone, username, password });

      // 2. Preparación para enviar WhatsApp automáticamente vía Evolution API
      const message = `¡Hola ${name.split(' ')[0]}!\n\nHas sido invitado como personal administrativo a nuestra plataforma.\n\nTus credenciales de acceso son:\n👤 Usuario: ${username}\n🔑 Contraseña: ${password}\n\nPor favor, cambia tu contraseña al ingresar.`;
      
      // TODO: Configurar Evolution API aquí
      /*
      await fetch('URL_EVOLUTION_API/message/sendText/INSTANCE', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'TU_API_KEY'
        },
        body: JSON.stringify({
          number: phone.replace(/\D/g, ''),
          text: message
        })
      });
      */
      
      // Simulación de tiempo de carga
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert("Usuario guardado. (En el futuro, aquí se enviará automáticamente por Evolution API).");
      
      // Limpiar formulario al terminar
      setName('');
      setIdNumber('');
      setPhone('');
    } catch (error) {
      console.error("Error al guardar/enviar:", error);
      alert("Hubo un error al procesar la invitación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.2 }}
           className="group relative flex items-center gap-2 px-6 h-12 bg-amber-500 hover:bg-amber-400 text-black font-headline tracking-widest uppercase text-sm rounded-xl transition-all overflow-hidden w-full md:w-auto justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
        >
           <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
           <UserPlus className="w-4 h-4" />
           <span>Invitar Usuario</span>
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border border-border text-foreground shadow-2xl shadow-amber-500/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline tracking-widest uppercase text-foreground">
            Invitar Personal Administrativo
          </DialogTitle>
          <DialogDescription className="text-foreground/40 font-light text-sm">
            Ingresa los datos básicos. Las credenciales de acceso se generarán automáticamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-foreground/60">Nombre Completo</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez" 
              className="bg-foreground/5 border-border text-foreground focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idNumber" className="text-xs uppercase tracking-widest text-foreground/60">Número de Cédula</Label>
            <Input 
              id="idNumber" 
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Ej. 1234567890" 
              className="bg-foreground/5 border-border text-foreground focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs uppercase tracking-widest text-foreground/60">Número de WhatsApp</Label>
            <Input 
              id="phone" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 573001234567" 
              className="bg-foreground/5 border-border text-foreground focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>

          <div className="bg-foreground/5 border border-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-headline tracking-widest uppercase text-amber-500">Credenciales Generadas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40">Usuario</span>
                <p className="text-sm font-medium text-foreground break-all">{username || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-foreground/40">Contraseña</span>
                <p className="text-sm font-medium text-foreground">{password || '-'}</p>
              </div>
            </div>
            {(username && password && username !== 'usuario...' && password !== 'Mivra****') && (
              <button 
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-xs font-headline uppercase tracking-widest rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? <span className="text-emerald-500">Copiado</span> : 'Copiar Credenciales'}
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-3">
          <button className="px-4 py-2 rounded-xl border border-border text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors text-xs font-headline uppercase tracking-widest">
            Cancelar
          </button>
          <button 
            onClick={handleSaveAndInvite}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-headline uppercase tracking-widest text-xs transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              'Guardar e Invitar'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [usersData, setUsersData] = useState(initialUsersData);
  const [editingUser, setEditingUser] = useState<typeof initialUsersData[0] | null>(null);
  const { toast } = useToast();

  const handleStatusToggle = (userId: number) => {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    
    setUsersData(prev => prev.map(u => 
      u.id === userId ? { ...u, status: newStatus } : u
    ));
    
    toast({
      title: newStatus === 'Active' ? 'Usuario Activado' : 'Usuario Desactivado',
      description: `El estado de ${user.name} ha cambiado.`,
    });
  };

  const handleDelete = (userId: number) => {
    const user = usersData.find(u => u.id === userId);
    if (user) {
      setUsersData(prev => prev.filter(u => u.id !== userId));
      toast({
        title: 'Usuario Eliminado',
        description: `${user.name} ha sido eliminado.`,
        variant: 'destructive',
      });
    }
  };

  const handleResetLink = (userName: string) => {
    toast({
      title: 'Enlace Enviado',
      description: `Se ha enviado un enlace de recuperación a ${userName}.`,
    });
  };

  const handleRoleChange = (newRole: string) => {
    if (editingUser) {
      setUsersData(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, role: newRole } : u
      ));
      toast({
        title: 'Rol Actualizado',
        description: `El rol de ${editingUser.name} ahora es ${newRole}.`,
      });
      setEditingUser(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground selection:bg-amber-500/30">
      <div className="max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
              <div className="flex items-center gap-3 mb-3">
                 <div className="h-px w-8 bg-amber-500" />
                 <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Control de Accesos</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
                Usuarios <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">VIP</span>
              </h1>
              <p className="text-foreground/40 font-light mt-4 tracking-wide max-w-xl text-sm">
                Administración exclusiva de personal interno. Gestiona accesos, roles y credenciales del equipo en la plataforma AdminPortal.
              </p>
          </motion.div>
          
          <InviteUserModal />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/80 backdrop-blur-3xl p-4 rounded-2xl border border-border shadow-2xl"
          >
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input 
                  placeholder="Buscar miembro VIP..." 
                  className="w-full bg-foreground/5 border-border text-foreground pl-12 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 transition-all placeholder:text-foreground/20"
              />
            </div>
            <button className="flex items-center gap-2 px-6 h-12 rounded-xl bg-white/[0.03] border border-border text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-all w-full sm:w-auto justify-center group">
                <Filter className="w-4 h-4 group-hover:text-amber-500 transition-colors" />
                <span className="text-sm font-light tracking-widest uppercase">Filtros</span>
            </button>
          </motion.div>

          {/* Dynamic VIP List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {usersData.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-background/80 backdrop-blur-3xl rounded-[24px] border border-border p-6 hover:border-amber-500/30 transition-all duration-500 flex flex-col justify-between h-full shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.05)]"
              >
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[24px]" />

                <div className="relative z-10">
                  {/* Header: Role & Status */}
                  <div className="flex justify-between items-start mb-6">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-headline tracking-widest uppercase border backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                      user.role === 'SuperAdmin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 
                      user.role === 'Support' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 
                      user.role === 'Admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 
                      user.role === 'Owner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                      user.role === 'Barber' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 
                      'bg-foreground/5 text-foreground/70 border-border'
                    }`}>
                        {user.role}
                    </span>
                    
                    {user.status === 'Active' ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse" />
                            <span className="text-[9px] font-medium text-emerald-500 uppercase tracking-widest">Activo</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/5 border border-red-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            <span className="text-[9px] font-medium text-red-500 uppercase tracking-widest">Inactivo</span>
                        </div>
                    )}
                  </div>

                  {/* Profile */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-[#111] border border-border flex items-center justify-center relative z-10 group-hover:border-amber-500/50 transition-colors duration-500">
                          <Users className="w-6 h-6 text-foreground/40 group-hover:text-amber-500 transition-colors duration-500" />
                      </div>
                      {user.status === 'Active' && (
                        <div className="absolute inset-0 rounded-full border border-amber-500/30 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-700 animate-[spin_4s_linear_infinite]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-headline tracking-wide text-foreground group-hover:text-amber-400 transition-colors duration-300">{user.name}</h3>
                      <p className="text-xs font-light text-foreground/40 mt-1">{user.email}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-2 text-foreground/30 bg-foreground/5 rounded-xl p-3 border border-border">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-light uppercase tracking-wider">Último acceso: <span className="text-foreground/60 ml-1">{user.lastLogin}</span></span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="relative z-10 mt-6 pt-4 border-t border-border flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="flex items-center justify-center w-8 h-8 text-foreground/40 hover:text-amber-500 transition-colors rounded-full hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20">
                              <MoreHorizontal className="w-4 h-4" />
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background border-border text-foreground shadow-2xl shadow-black rounded-xl p-1 backdrop-blur-3xl">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-foreground/40 font-headline px-2 py-1.5">Acciones VIP</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-foreground/10" />
                          
                          <DropdownMenuItem 
                            onClick={() => setEditingUser(user)}
                            className="flex items-center gap-3 cursor-pointer hover:bg-foreground/5 focus:bg-foreground/5 text-xs font-light py-2.5 rounded-lg transition-colors tracking-wide"
                          >
                              <Edit className="w-3.5 h-3.5 text-blue-400" />
                              <span>Editar Rol</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => handleResetLink(user.name)}
                            className="flex items-center gap-3 cursor-pointer hover:bg-foreground/5 focus:bg-foreground/5 text-xs font-light py-2.5 rounded-lg transition-colors tracking-wide"
                          >
                              <Key className="w-3.5 h-3.5 text-purple-400" />
                              <span>Reseteo de Clave</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-foreground/10" />
                          
                          {user.status === 'Active' ? (
                            <DropdownMenuItem 
                              onClick={() => handleStatusToggle(user.id)}
                              className="flex items-center gap-3 cursor-pointer hover:bg-amber-500/10 focus:bg-amber-500/10 text-amber-500 text-xs font-light py-2.5 rounded-lg transition-colors tracking-wide"
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Revocar Acceso</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleStatusToggle(user.id)}
                              className="flex items-center gap-3 cursor-pointer hover:bg-emerald-500/10 focus:bg-emerald-500/10 text-emerald-500 text-xs font-light py-2.5 rounded-lg transition-colors tracking-wide"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Restaurar Acceso</span>
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user.id)}
                            className="flex items-center gap-3 cursor-pointer hover:bg-rose-500/10 focus:bg-rose-500/10 text-rose-500 text-xs font-light py-2.5 rounded-lg transition-colors tracking-wide mt-1"
                          >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Permanentemente</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="sm:max-w-md bg-background border border-border text-foreground shadow-2xl shadow-amber-500/10 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-headline tracking-widest uppercase text-foreground">Editar Rol de Miembro</DialogTitle>
              <DialogDescription className="text-foreground/40 font-light text-sm">
                Selecciona la nueva jerarquía VIP para {editingUser?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-4">
              {['SuperAdmin', 'Owner', 'Barber', 'Admin', 'Support'].map(role => (
                <button 
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${editingUser?.role === role ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-border bg-foreground/5 hover:bg-foreground/10'}`}
                >
                  <span className="font-headline tracking-widest uppercase text-sm">{role}</span>
                  {editingUser?.role === role && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
