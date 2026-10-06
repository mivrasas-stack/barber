"use client"
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Scissors, Edit2, Trash2, KeyRound, Copy, Check, ShieldCheck } from "lucide-react";
import { dummyBarbers } from "../data";
import { useState } from "react";
import type { Barber } from "@/lib/types";
import { AddBarberForm } from "@/components/dashboard/AddBarberForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PremiumButton } from "@/components/ui/premium-button";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>(dummyBarbers);
  const [isBarberFormOpen, setIsBarberFormOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  const handleOpenBarberForm = (barber: Barber | null = null) => {
    setEditingBarber(barber);
    setIsBarberFormOpen(true);
  };

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

  const handleSaveBarber = (barberData: Omit<Barber, 'id'> | Barber) => {
    if ('id' in barberData) {
      const updatedBarbers = barbers.map(b => b.id === barberData.id ? { ...b, ...barberData } : b);
      setBarbers(updatedBarbers);
      const dummyIndex = dummyBarbers.findIndex(b => b.id === barberData.id);
      if (dummyIndex !== -1) {
          dummyBarbers[dummyIndex] = { ...dummyBarbers[dummyIndex], ...barberData };
      }
    } else {
      const generatedEmail = barberData.email?.trim() || `${barberData.name.toLowerCase().trim().replace(/\s+/g, '.')}@mivraba.com`;
      const generatedPassword = generateSimplePassword(barberData.name);

      const newBarber: Barber = {
        ...barberData,
        id: `BBR${barbers.length + 1}`,
        email: generatedEmail,
        password: generatedPassword,
      };
      const updatedBarbers = [...barbers, newBarber];
      setBarbers(updatedBarbers);
      dummyBarbers.push(newBarber);

      try {
        const stored = JSON.parse(localStorage.getItem('registered_barber_credentials') || '[]');
        stored.push({
          email: generatedEmail.toLowerCase(),
          password: generatedPassword,
          name: barberData.name,
          role: 'barber'
        });
        localStorage.setItem('registered_barber_credentials', JSON.stringify(stored));
      } catch (err) {
        console.error('Error saving credentials:', err);
      }

      setCreatedCredentials({
        barberName: barberData.name,
        email: generatedEmail,
        password: generatedPassword,
      });
    }
    setIsBarberFormOpen(false);
    setEditingBarber(null);
  };
  
  const handleDeleteBarber = (barberId: string) => {
    const updatedBarbers = barbers.filter(b => b.id !== barberId);
    setBarbers(updatedBarbers);
    const dummyIndex = dummyBarbers.findIndex(b => b.id === barberId);
    if (dummyIndex !== -1) {
      dummyBarbers.splice(dummyIndex, 1);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader title="Staff Élite">
        <Button 
          size="sm" 
          className="gap-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-foreground border-0 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all" 
          onClick={() => handleOpenBarberForm()}
        >
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap font-medium">
            Nuevo Maestro
          </span>
        </Button>
      </PageHeader>
      
      <AddBarberForm 
        isOpen={isBarberFormOpen}
        onOpenChange={(isOpen) => {
          setIsBarberFormOpen(isOpen)
          if(!isOpen) setEditingBarber(null)
        }}
        onSaveBarber={handleSaveBarber}
        existingBarber={editingBarber}
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {barbers.map((barber) => (
          <motion.div 
            key={barber.id}
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-foreground/5 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-border p-6 flex flex-col items-center text-center transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
          >
            {/* Fondo decorativo */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Avatar container */}
            <div className="relative mb-6">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 blur group-hover:opacity-60 transition-opacity duration-500" />
              <Avatar className="h-28 w-28 border-2 border-border dark:border-border shadow-xl group-hover:border-amber-500/50 transition-colors duration-500 relative z-10 bg-background/50">
                <AvatarImage src={barber.avatarUrl} alt={barber.name} className="object-cover" />
                <AvatarFallback className="text-3xl font-light text-amber-600/70">{barber.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-1 group-hover:text-amber-500 transition-colors">
              {barber.name}
            </h3>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium mb-6">
              <Scissors className="w-3.5 h-3.5 text-amber-500/70" />
              <span>Master Barber</span>
            </div>

            {/* Actions overlay */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md hover:bg-background/80">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 border-border bg-background/95 backdrop-blur-xl">
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleOpenBarberForm(barber)} className="cursor-pointer gap-2 focus:bg-foreground/10">
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteBarber(barber.id)} className="cursor-pointer gap-2 text-red-400 focus:text-red-400 focus:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </motion.div>

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
