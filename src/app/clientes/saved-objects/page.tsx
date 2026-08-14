"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Package, Calendar, User, Clock, Trash2, CheckCircle2 } from "lucide-react";
import { dummySavedObjects } from "../data";
import type { SavedObject } from '@/lib/types';
import { AddSavedObjectForm } from '@/components/dashboard/AddSavedObjectForm';

export default function SavedObjectsPage() {
  const [savedObjects, setSavedObjects] = useState<SavedObject[]>(dummySavedObjects);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddObject = (newObject: Omit<SavedObject, 'id' | 'dateStored' | 'dateReturned' | 'status'>) => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const objectWithId = { 
        ...newObject, 
        id: `OBJ${savedObjects.length + 1}`,
        dateStored: formattedDate,
        dateReturned: null,
        status: 'Guardado' as const,
    };
    const updatedObjects = [...savedObjects, objectWithId];
    setSavedObjects(updatedObjects);
    dummySavedObjects.push(objectWithId);
    setIsFormOpen(false);
  };
  
  const handleMarkAsReturned = (objectId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedObjects = savedObjects.map(obj => 
      obj.id === objectId 
        ? { ...obj, status: 'Devuelto' as const, dateReturned: today }
        : obj
    );
    setSavedObjects(updatedObjects);

    const dummyIndex = dummySavedObjects.findIndex(obj => obj.id === objectId);
    if (dummyIndex !== -1) {
      dummySavedObjects[dummyIndex].status = 'Devuelto';
      dummySavedObjects[dummyIndex].dateReturned = today;
    }
  };

  const handleDeleteObject = (objectId: string) => {
    const updatedObjects = savedObjects.filter(obj => obj.id !== objectId);
    setSavedObjects(updatedObjects);

    const dummyIndex = dummySavedObjects.findIndex(obj => obj.id === objectId);
    if (dummyIndex !== -1) {
      dummySavedObjects.splice(dummyIndex, 1);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] text-zinc-100 p-4 md:p-8 rounded-xl border border-white/5">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-2">Objetos Guardados</h1>
              <p className="text-zinc-400 font-light">Gestiona los artículos dejados por los clientes en el salón.</p>
            </div>
            <Button 
              className="bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] gap-2 rounded-full px-6 h-12"
              onClick={() => setIsFormOpen(true)}
            >
              <PlusCircle className="h-5 w-5" />
              <span className="font-medium">Añadir Objeto</span>
            </Button>
          </div>
        </motion.div>

        <AddSavedObjectForm
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onAddObject={handleAddObject}
        />

        {/* Bento Box Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {savedObjects.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                layout
                initial="hidden"
                animate="visible"
                exit="exit"
                className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md transition-all hover:bg-white/[0.04] hover:border-white/10 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.05)] hover:-translate-y-1"
              >
                {/* Actions Menu */}
                <div className="absolute top-4 right-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 rounded-xl shadow-xl">
                      <DropdownMenuItem 
                          onClick={() => handleMarkAsReturned(item.id)}
                          disabled={item.status === 'Devuelto'}
                          className="hover:bg-zinc-800 hover:text-white cursor-pointer rounded-lg"
                      >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar como Devuelto
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                          onClick={() => handleDeleteObject(item.id)}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer rounded-lg mt-1"
                      >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content */}
                <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                  
                  {/* Status Badge */}
                  <div className="flex items-start">
                    <Badge 
                      variant="outline"
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        item.status === 'Guardado' 
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {/* Main Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-400 mb-2">
                      <Package className="h-4 w-4" />
                      <span className="text-[10px] uppercase tracking-widest font-semibold">Objeto</span>
                    </div>
                    <h3 className="text-xl font-medium text-white truncate" title={item.objectName}>
                      {item.objectName}
                    </h3>
                  </div>

                  {/* Secondary Info: Customer & Dates */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Cliente</p>
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.customerName}</p>
                      </div>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Entregado</p>
                        <p className="text-xs text-zinc-300 mt-0.5">{item.dateStored}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Devuelto</p>
                        <p className="text-xs text-zinc-300 mt-0.5">{item.dateReturned || '—'}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {savedObjects.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Package className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-xl text-zinc-300 font-medium mb-2">No hay objetos guardados</h3>
            <p className="text-zinc-500 font-light">Los artículos olvidados por los clientes aparecerán aquí.</p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
