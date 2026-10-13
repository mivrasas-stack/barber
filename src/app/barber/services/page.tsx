"use client";
import React, { useEffect, useState } from 'react';
import { Scissors, Clock, DollarSign, Plus } from 'lucide-react';
import { PremiumButton } from '@/components/ui/premium-button';
import { motion } from 'framer-motion';
import { AddServiceForm } from '@/components/dashboard/AddServiceForm';
import type { Service } from '@/lib/types';

export default function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch('/api/v1/professionals/me/services', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los servicios');
        if (active) setServices(payload.data);
      }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Error al cargar los servicios'); });
    return () => { active = false; };
  }, []);

  const handleSaveService = async (service: Service | Omit<Service, 'id'>) => {
    setBusy(true);
    setError(null);
    try {

      const editingId = 'id' in service ? service.id : undefined;
      const response = await fetch(editingId ? "/api/v1/professionals/me/services/" + editingId : '/api/v1/professionals/me/services', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name, description: service.description,
          duration: service.duration, price: service.price,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el servicio');
      setServices(prev => editingId ? prev.map(item => item.id === editingId ? result.data : item) : [...prev, result.data]);
      setEditing(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el servicio');
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      <div className="fixed top-0 left-1/3 w-[60vw] h-[60vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 mix-blend-screen" />
      
      <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center hidden sm:flex shadow-2xl">
            <Scissors className="w-8 h-8 text-foreground/80" />
          </div>
          <div>
            <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Catálogo de Servicios</p>
            <h2 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
              Tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Servicios</span>
            </h2>
          </div>
        </div>
        
        <PremiumButton 
          className="relative z-10 w-full sm:w-auto flex items-center justify-center gap-2 h-14 px-8"
          onClick={() => { setEditing(null); setIsModalOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          <span className="tracking-widest text-[10px] sm:text-xs uppercase">Nuevo Servicio</span>
        </PremiumButton>
      </div>

      {error && <p role="alert" className="text-red-400 mb-4">{error}</p>}
      {busy && <p role="status" className="text-amber-400 mb-4">Guardando servicio...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {services.map((service, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            key={service.id} 
            className="group relative overflow-hidden rounded-[32px] bg-card border border-border hover:border-amber-500/30 transition-all duration-500 flex flex-col justify-between backdrop-blur-xl shadow-2xl min-h-[220px]"
          >
            {/* Background Texture/Image Mockup */}
            <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/90 z-0" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-0 group-hover:opacity-10 transition-opacity duration-700 mix-blend-luminosity grayscale" />
            
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/0 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
            
            <div className="relative z-10 p-8 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-foreground/40 group-hover:text-amber-500/80 transition-colors">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-light tracking-wide">{service.duration} MIN</span>
                  </div>
                  <button type="button" aria-label="Editar servicio" onClick={() => { setEditing(service); setIsModalOpen(true); }} className="text-foreground/20 hover:text-foreground transition-colors p-2 -mr-2 rounded-full hover:bg-foreground/5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </div>
                
                <h3 className="text-2xl font-serif italic text-foreground tracking-wide group-hover:text-amber-100 transition-colors leading-tight">{service.name}</h3>
                {service.description && (
                  <p className="text-xs font-light text-foreground/40 mt-3 line-clamp-2 leading-relaxed max-w-[90%]">{service.description}</p>
                )}
              </div>
              
              <button type="button" className="text-xs text-red-400 hover:text-red-300 text-left mt-4" onClick={async () => {
                if (!window.confirm('¿Desactivar este servicio?')) return;
                try {
                  const response = await fetch(`/api/v1/professionals/me/services/${service.id}`, { method: 'DELETE' });
                  if (!response.ok) throw new Error('No se pudo desactivar');
                  setServices(prev => prev.filter(item => item.id !== service.id));
                } catch (e) { setError(e instanceof Error ? e.message : 'Error al desactivar'); }
              }}>Desactivar servicio</button>
              <div className="flex items-end justify-between mt-8 pt-6 border-t border-border group-hover:border-amber-500/10 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] mb-1">Precio Final</span>
                  <div className="flex items-center gap-1 text-foreground font-headline tracking-widest text-xl group-hover:text-amber-400 transition-colors">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    {service.price.toLocaleString()} COP
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AddServiceForm
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSaveService={handleSaveService}
        existingService={editing}
      />
    </div>
  );
}
