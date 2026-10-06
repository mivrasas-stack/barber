"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  UserPlus, Scissors, Phone, Mail, Clock, Percent, Star, 
  CheckCircle2, XCircle, Search, Edit2, CalendarDays, Wallet,
  ShieldCheck, AlertCircle, Sparkles, Filter, MoreVertical,
  Copy, Check, KeyRound
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PremiumButton } from '@/components/ui/premium-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { dummyBarbers } from '@/app/clientes/data';
import type { Barber } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function BarberosManagementPage() {
  const [barbers, setBarbers] = useState<Barber[]>(dummyBarbers);
  const [searchTerm, setSearchTerm] = useState('');

  // Recalcular promedios de valoración en base a reseñas guardadas por los clientes
  React.useEffect(() => {
    try {
      const storedReviews: Array<{ barberId: string; rating: number }> = JSON.parse(
        localStorage.getItem('barber_reviews') || '[]'
      );
      if (storedReviews.length > 0) {
        setBarbers(prev =>
          prev.map(b => {
            const bReviews = storedReviews.filter(r => r.barberId === b.id || r.barberId === b.name);
            if (bReviews.length > 0) {
              const avg = bReviews.reduce((sum, r) => sum + r.rating, 0) / bReviews.length;
              return { ...b, rating: Number(avg.toFixed(1)) };
            }
            return b;
          })
        );
      }
    } catch (err) {
      console.error('Error al cargar valoraciones:', err);
    }
  }, []);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    specialty: 'Master Barber & Diseños',
    phone: '',
    email: '',
    commissionRate: 50,
    schedule: 'Lun - Sáb: 9:00 AM - 7:00 PM',
    avatarUrl: '',
    bio: '',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    barberName: string;
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'all' | null>(null);

  const copyToClipboard = (text: string, field: 'email' | 'password' | 'all') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const generateSimplePassword = (name: string) => {
    const firstName = name.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `${firstName || 'barber'}${digits}`;
  };

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenNewBarber = () => {
    setEditingBarber(null);
    setFormData({
      name: '',
      specialty: 'Master Barber & Diseños',
      phone: '',
      email: '',
      commissionRate: 50,
      schedule: 'Lun - Sáb: 9:00 AM - 7:00 PM',
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&h=150&fit=crop`,
      bio: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      specialty: barber.specialty || 'Barbero Profesional',
      phone: barber.phone || '',
      email: barber.email || '',
      commissionRate: barber.commissionRate || 50,
      schedule: barber.schedule || 'Lun - Sáb: 9:00 AM - 7:00 PM',
      avatarUrl: barber.avatarUrl || '',
      bio: barber.bio || '',
    });
    setIsDialogOpen(true);
  };

  const handleSaveBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingBarber) {
      setBarbers(prev =>
        prev.map(b =>
          b.id === editingBarber.id
            ? {
                ...b,
                ...formData,
              }
            : b
        )
      );
      showNotification(`Información de ${formData.name} actualizada correctamente.`);
      setIsDialogOpen(false);
    } else {
      const generatedEmail = formData.email.trim() || `${formData.name.toLowerCase().trim().replace(/\s+/g, '.')}@mivraba.com`;
      const generatedPassword = generateSimplePassword(formData.name);

      const newBarber: Barber = {
        id: `BBR00${barbers.length + 1}`,
        name: formData.name,
        avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
        specialty: formData.specialty,
        phone: formData.phone || '+57 300 000 0000',
        email: generatedEmail,
        password: generatedPassword,
        commissionRate: Number(formData.commissionRate),
        status: 'active',
        schedule: formData.schedule,
        bio: formData.bio || 'Barbero profesional certificado MIVRA.',
        rating: 0,
        completedCuts: 0,
      };

      setBarbers(prev => [newBarber, ...prev]);

      // Guardar credenciales en localStorage para que funcionen en el login
      try {
        const stored = JSON.parse(localStorage.getItem('registered_barber_credentials') || '[]');
        stored.push({
          email: generatedEmail.toLowerCase(),
          password: generatedPassword,
          name: formData.name,
          role: 'barber'
        });
        localStorage.setItem('registered_barber_credentials', JSON.stringify(stored));
      } catch (err) {
        console.error('Error al guardar credenciales:', err);
      }

      setIsDialogOpen(false);
      
      // Abrir modal con las credenciales generadas
      setCreatedCredentials({
        barberName: formData.name,
        email: generatedEmail,
        password: generatedPassword,
      });

      showNotification(`¡Barbero ${formData.name} incorporado exitosamente al equipo!`);
    }
  };

  const handleToggleStatus = (id: string) => {
    setBarbers(prev =>
      prev.map(b => {
        if (b.id === id) {
          const nextStatus = b.status === 'active' ? 'inactive' : 'active';
          showNotification(
            `Estado de ${b.name} cambiado a ${nextStatus === 'active' ? 'Activo' : 'Inactivo'}.`,
            'info'
          );
          return { ...b, status: nextStatus };
        }
        return b;
      })
    );
  };

  // Filtered list
  const filteredBarbers = barbers.filter(barber => {
    const matchesSearch =
      barber.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barber.specialty && barber.specialty.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && barber.status !== 'inactive') ||
      (filterStatus === 'inactive' && barber.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  const activeCount = barbers.filter(b => b.status !== 'inactive').length;
  const avgCommission = Math.round(
    barbers.reduce((acc, b) => acc + (b.commissionRate || 50), 0) / (barbers.length || 1)
  );

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      {/* Glows de fondo */}
      <div className="fixed top-0 right-1/4 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Alerta flotante */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-50 px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/30 text-amber-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-headline tracking-widest uppercase">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm">Gestión de Talento</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Equipo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Barberos</span>
          </h1>
          <p className="text-foreground/40 font-light tracking-wide mt-2 text-sm md:text-base">
            Administra los barberos de la barbería, turnos, comisiones y disponibilidad.
          </p>
        </div>

        <PremiumButton
          onClick={handleOpenNewBarber}
          className="relative z-10 flex items-center justify-center gap-2 h-14 px-8"
        >
          <UserPlus className="w-5 h-5" />
          <span className="tracking-widest text-xs uppercase">Añadir Nuevo Barbero</span>
        </PremiumButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 relative z-10">
        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Scissors className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-headline tracking-[0.2em] uppercase text-foreground/40">Total Barberos</p>
            <h3 className="text-3xl font-headline text-foreground mt-1">{barbers.length}</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-headline tracking-[0.2em] uppercase text-foreground/40">En Servicio Activo</p>
            <h3 className="text-3xl font-headline text-foreground mt-1">{activeCount}</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Percent className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-headline tracking-[0.2em] uppercase text-foreground/40">Comisión Promedio</p>
            <h3 className="text-3xl font-headline text-foreground mt-1">{avgCommission}%</h3>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Star className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-headline tracking-[0.2em] uppercase text-foreground/40">Rating Barbería</p>
            <h3 className="text-3xl font-headline text-foreground mt-1">4.9 ★</h3>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtro */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 relative z-10 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-foreground/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o especialidad..."
            className="pl-11 bg-card border-border rounded-2xl h-12 text-sm focus-visible:ring-amber-500/50 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-44 bg-card border-border rounded-2xl h-12 text-xs font-headline tracking-widest uppercase">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground rounded-2xl">
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="active">Solo Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Barberos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredBarbers.map((barber, index) => {
          const isActive = barber.status !== 'inactive';
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              key={barber.id}
              className={`rounded-[32px] bg-card border transition-all duration-500 p-7 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden group shadow-2xl ${
                isActive ? 'border-border hover:border-amber-500/30' : 'border-border/40 opacity-70 hover:opacity-100'
              }`}
            >
              {/* Glow decorativo al hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

              <div>
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-border group-hover:border-amber-500/40 transition-colors shadow-lg">
                        <AvatarImage src={barber.avatarUrl} alt={barber.name} className="object-cover" />
                        <AvatarFallback className="font-headline text-lg bg-foreground/10">{barber.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${
                          isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'
                        }`}
                        title={isActive ? 'Activo' : 'Inactivo'}
                      />
                    </div>
                    <div>
                      <h3 className="font-headline tracking-widest text-lg uppercase text-foreground group-hover:text-amber-200 transition-colors">
                        {barber.name}
                      </h3>
                      <p className="text-xs text-amber-500 font-light tracking-wide mt-0.5">
                        {barber.specialty || 'Master Barber'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(barber)}
                    className="w-9 h-9 rounded-xl bg-foreground/5 hover:bg-amber-500/10 hover:text-amber-400 border border-border transition-colors flex items-center justify-center text-foreground/50"
                    title="Editar barbero"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Métricas rápidas del barbero */}
                <div className="grid grid-cols-2 gap-3 py-3 px-4 rounded-2xl bg-foreground/5 border border-border/50 mb-5">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline">Valoración</p>
                      <p className="text-xs font-headline tracking-wide text-foreground">{barber.rating ?? 0} / 5.0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline">Comisión</p>
                      <p className="text-xs font-headline tracking-wide text-emerald-400">{barber.commissionRate || 50}%</p>
                    </div>
                  </div>
                </div>

                {/* Info de contacto y horario */}
                <div className="space-y-2.5 text-xs text-foreground/60 mb-6">
                  {barber.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-mono text-[11px]">{barber.phone}</span>
                    </div>
                  )}
                  {barber.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate text-[11px]">{barber.email}</span>
                    </div>
                  )}
                  {barber.schedule && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] tracking-wide text-foreground/80">{barber.schedule}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción inferior */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/barber/appointments?barberId=${barber.id}`}
                    className="p-2.5 rounded-xl bg-foreground/5 hover:bg-amber-500/10 text-foreground/60 hover:text-amber-400 transition-colors flex items-center gap-1.5 text-[10px] font-headline tracking-wider uppercase border border-border"
                    title="Ver citas asignadas"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                    <span>Citas</span>
                  </Link>

                  <Link
                    href={`/barber/accounting?barberId=${barber.id}`}
                    className="p-2.5 rounded-xl bg-foreground/5 hover:bg-emerald-500/10 text-foreground/60 hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-[10px] font-headline tracking-wider uppercase border border-border"
                    title="Ver contabilidad de este barbero"
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Caja</span>
                  </Link>
                </div>

                <button
                  onClick={() => handleToggleStatus(barber.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-headline tracking-widest uppercase border transition-all ${
                    isActive
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal / Dialog para Crear o Editar Barbero */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-foreground">
              {editingBarber ? 'Editar Barbero' : 'Añadir Nuevo Barbero'}
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/50 tracking-wide font-light">
              {editingBarber
                ? 'Actualiza los datos personales, especialidad y comisión del barbero.'
                : 'Completa los datos para registrar un nuevo barbero en la nómina de la barbería.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBarber} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Nombre Completo *</Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Mateo Valencia"
                className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Especialidad</Label>
                <Input
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ej. Fade & Diseños"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Comisión (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={e => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                  className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Teléfono / WhatsApp</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+57 310 123 4567"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="mateo@mivraba.com"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Horario de Trabajo / Días</Label>
              <Input
                value={formData.schedule}
                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                placeholder="Lun - Sáb: 8:00 AM - 6:00 PM"
                className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Foto de Perfil (URL)</Label>
              <Input
                value={formData.avatarUrl}
                onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                placeholder="https://..."
                className="bg-foreground/5 border-border rounded-xl h-11 text-sm focus-visible:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Biografía / Presentación</Label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Breve reseña sobre la experiencia del barbero..."
                rows={2}
                className="w-full bg-foreground/5 border border-border text-foreground rounded-xl p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 resize-none"
              />
            </div>

            <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-foreground/60 hover:text-foreground text-xs font-headline tracking-widest uppercase transition-colors"
              >
                Cancelar
              </button>
              <PremiumButton type="submit" className="px-6 py-2.5">
                <span className="text-xs uppercase tracking-widest font-headline">
                  {editingBarber ? 'Guardar Cambios' : 'Registrar Barbero'}
                </span>
              </PremiumButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alerta Personalizada con Credenciales */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-amber-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] text-foreground">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <KeyRound className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-amber-400">
              ¡Barbero Registrado!
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/70 tracking-wide">
              Se han generado automáticamente las credenciales de inicio de sesión para <strong className="text-foreground font-semibold">{createdCredentials?.barberName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials && (
            <div className="space-y-4 my-4">
              {/* Campo Correo */}
              <div className="p-3.5 rounded-2xl bg-foreground/5 border border-border space-y-1">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 block">
                  Correo Electrónico (Usuario)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-amber-200 select-all truncate">
                    {createdCredentials.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-headline tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'email' ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="p-3.5 rounded-2xl bg-foreground/5 border border-border space-y-1">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 block">
                  Contraseña Generada
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold text-emerald-400 select-all tracking-wider">
                    {createdCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-headline tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'password' ? '¡Copiada!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Aviso de seguridad */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-300/80">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  El barbero podrá iniciar sesión de inmediato con estos datos en la pantalla de ingreso.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (createdCredentials) {
                  const allText = `Credenciales de Acceso - MIVRA BARBER\nBarbero: ${createdCredentials.barberName}\nCorreo: ${createdCredentials.email}\nContraseña: ${createdCredentials.password}`;
                  copyToClipboard(allText, 'all');
                }
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-headline text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'all' ? '¡Todo Copiado!' : 'Copiar Todo'}</span>
            </button>

            <PremiumButton
              onClick={() => setCreatedCredentials(null)}
              className="w-full sm:w-auto py-3 text-xs uppercase tracking-widest font-headline px-6"
            >
              Entendido / Listo
            </PremiumButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
