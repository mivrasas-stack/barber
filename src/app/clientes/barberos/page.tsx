"use client"
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Scissors, Edit2, Trash2 } from "lucide-react";
import { dummyBarbers } from "../data";
import { useState } from "react";
import type { Barber } from "@/lib/types";
import { AddBarberForm } from "@/components/dashboard/AddBarberForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>(dummyBarbers);
  const [isBarberFormOpen, setIsBarberFormOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  const handleOpenBarberForm = (barber: Barber | null = null) => {
    setEditingBarber(barber);
    setIsBarberFormOpen(true);
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
      const newBarber = { ...barberData, id: `BBR${barbers.length + 1}` };
      const updatedBarbers = [...barbers, newBarber];
      setBarbers(updatedBarbers);
      dummyBarbers.push(newBarber);
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
          className="gap-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white border-0 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all" 
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
            className="group relative overflow-hidden rounded-2xl bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6 flex flex-col items-center text-center transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
          >
            {/* Fondo decorativo */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Avatar container */}
            <div className="relative mb-6">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 blur group-hover:opacity-60 transition-opacity duration-500" />
              <Avatar className="h-28 w-28 border-2 border-white/20 dark:border-white/10 shadow-xl group-hover:border-amber-500/50 transition-colors duration-500 relative z-10 bg-background/50">
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
                <DropdownMenuContent align="end" className="w-40 border-white/10 bg-background/95 backdrop-blur-xl">
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleOpenBarberForm(barber)} className="cursor-pointer gap-2 focus:bg-white/10">
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
    </div>
  );
}
