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
           <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
           <UserPlus className="w-4 h-4" />
           <span>Invitar Usuario</span>
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border border-white/10 text-white shadow-2xl shadow-amber-500/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline tracking-widest uppercase text-white">
            Invitar Personal Administrativo
          </DialogTitle>
          <DialogDescription className="text-white/40 font-light text-sm">
            Ingresa los datos básicos. Las credenciales de acceso se generarán automáticamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest text-white/60">Nombre Completo</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez" 
              className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idNumber" className="text-xs uppercase tracking-widest text-white/60">Número de Cédula</Label>
            <Input 
              id="idNumber" 
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Ej. 1234567890" 
              className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs uppercase tracking-widest text-white/60">Número de WhatsApp</Label>
            <Input 
              id="phone" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 573001234567" 
              className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/20"
            />
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-headline tracking-widest uppercase text-amber-500">Credenciales Generadas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Usuario</span>
                <p className="text-sm font-medium text-white break-all">{username || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Contraseña</span>
                <p className="text-sm font-medium text-white">{password || '-'}</p>
              </div>
            </div>
            {(username && password && username !== 'usuario...' && password !== 'Mivra****') && (
              <button 
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-xs font-headline uppercase tracking-widest rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? <span className="text-emerald-500">Copiado</span> : 'Copiar Credenciales'}
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-3">
          <button className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-xs font-headline uppercase tracking-widest">
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
    <div className="w-full max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8 pb-20">
      
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
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Usuarios <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Globales</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Administración de personal interno y niveles de acceso a la plataforma AdminPortal. Gestiona permisos, invita nuevos miembros y revoca credenciales.
            </p>
        </motion.div>
        
        <InviteUserModal />
      </div>

      {/* Main Content */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, delay: 0.2 }}
         className="relative rounded-[32px] bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5 overflow-hidden"
      >
          {/* Controls */}
          <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/40">
              <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input 
                      placeholder="Buscar por nombre, email o rol..." 
                      className="w-full bg-white/5 border-white/10 text-white pl-12 h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
              </div>
              <button className="flex items-center gap-2 px-6 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-light tracking-widest uppercase">Filtros</span>
              </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Usuario</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Rol</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Estado</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Último Acceso</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {usersData.map((user) => (
                          <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-900/40 border border-amber-500/30 flex items-center justify-center">
                                          <Users className="w-4 h-4 text-amber-500" />
                                      </div>
                                      <div>
                                          <p className="font-headline tracking-wide text-white group-hover:text-amber-300 transition-colors">{user.name}</p>
                                          <p className="text-[10px] font-light text-white/40 mt-1">{user.email}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-headline tracking-widest uppercase border ${
                                      user.role === 'SuperAdmin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                                      user.role === 'Support' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                      'bg-white/5 text-white/70 border-white/10'
                                  }`}>
                                      {user.role}
                                  </span>
                              </td>
                              <td className="px-8 py-6">
                                  {user.status === 'Active' ? (
                                      <div className="flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest">Activo</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2">
                                          <ShieldAlert className="w-4 h-4 text-red-500" />
                                          <span className="text-[10px] font-medium text-red-500 uppercase tracking-widest">Inactivo</span>
                                      </div>
                                  )}
                              </td>
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-2 text-white/40">
                                      <Clock className="w-3 h-3" />
                                      <span className="text-xs font-light">{user.lastLogin}</span>
                                  </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <button className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
                                              <MoreHorizontal className="w-5 h-5" />
                                          </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 bg-[#0a0a0a] border-white/10 text-white shadow-xl shadow-black/50 rounded-xl p-1">
                                          <DropdownMenuLabel className="text-xs uppercase tracking-widest text-white/40 font-headline">Acciones</DropdownMenuLabel>
                                          <DropdownMenuSeparator className="bg-white/10" />
                                          
                                          <DropdownMenuItem 
                                            onClick={() => setEditingUser(user)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Edit className="w-4 h-4 text-blue-500" />
                                              <span>Editar Rol</span>
                                          </DropdownMenuItem>
                                          
                                          <DropdownMenuItem 
                                            onClick={() => handleResetLink(user.name)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Key className="w-4 h-4 text-purple-500" />
                                              <span>Reseteo de Clave</span>
                                          </DropdownMenuItem>
                                          
                                          <DropdownMenuSeparator className="bg-white/10" />
                                          
                                          {user.status === 'Active' ? (
                                            <DropdownMenuItem 
                                              onClick={() => handleStatusToggle(user.id)}
                                              className="flex items-center gap-2 cursor-pointer hover:bg-amber-500/10 focus:bg-amber-500/10 text-amber-500 text-sm py-2 rounded-lg transition-colors"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                                <span>Desactivar Acceso</span>
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem 
                                              onClick={() => handleStatusToggle(user.id)}
                                              className="flex items-center gap-2 cursor-pointer hover:bg-green-500/10 focus:bg-green-500/10 text-green-500 text-sm py-2 rounded-lg transition-colors"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Activar Acceso</span>
                                            </DropdownMenuItem>
                                          )}
                                          
                                          <DropdownMenuItem 
                                            onClick={() => handleDelete(user.id)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-500 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                              <span>Eliminar Usuario</span>
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </motion.div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0a] border border-white/10 text-white shadow-2xl shadow-amber-500/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline tracking-widest uppercase text-white">Editar Rol de Usuario</DialogTitle>
            <DialogDescription className="text-white/40 font-light text-sm">
              Selecciona el nuevo rol para {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {['SuperAdmin', 'Admin', 'Support'].map(role => (
              <button 
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${editingUser?.role === role ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <span className="font-headline tracking-widest uppercase text-sm">{role}</span>
                {editingUser?.role === role && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
