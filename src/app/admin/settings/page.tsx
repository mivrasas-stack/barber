"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Server, Globe, ShieldAlert, Key, Database, RefreshCcw, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SaaSGlobalSettingsPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 px-4 sm:px-6 lg:px-8 py-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex items-center gap-3 mb-3">
               <div className="h-px w-8 bg-amber-500" />
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Configuración Root</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Ajustes <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Globales</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Parámetros críticos del sistema SaaS. Cuidado: Los cambios aquí afectan a todos los inquilinos (Tenants) conectados a la plataforma.
            </p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8, delay: 0.2 }}
           className="flex gap-4"
        >
            <button className="group relative h-12 px-6 flex items-center justify-center gap-2 bg-amber-600 text-white font-medium tracking-wider text-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Save className="w-4 h-4 relative z-10" />
                <span className="relative z-10 uppercase font-headline">Guardar Configuración</span>
            </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings Area */}
          <div className="lg:col-span-2 space-y-6">
              
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: 0.2 }}
              >
                  <Card className="bg-[#0A0A0A] border-white/5 rounded-[32px] overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                      <CardHeader className="border-b border-white/5 pb-6 pt-8 px-8">
                          <CardTitle className="text-sm font-light tracking-widest text-white/50 uppercase flex items-center gap-3">
                              <Globe className="w-5 h-5 text-amber-500" />
                              Plataforma & Marca Blanca
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                  <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Nombre del SaaS</label>
                                  <Input defaultValue="Barber Paradise Platform" className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50" />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Dominio Principal</label>
                                  <Input defaultValue="app.barberparadise.com" className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50" />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Email de Soporte Global</label>
                                  <Input defaultValue="support@barberparadise.com" type="email" className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50" />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Moneda Base (Barberías)</label>
                                  <Select defaultValue="COP">
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 focus:ring-offset-0 focus:ring-offset-transparent">
                                      <SelectValue placeholder="Seleccionar Moneda" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-white/10 text-white rounded-xl">
                                      <SelectItem value="USD" className="focus:bg-white/10 focus:text-amber-400 cursor-pointer">Dólar Estadounidense (USD)</SelectItem>
                                      <SelectItem value="COP" className="focus:bg-white/10 focus:text-amber-400 cursor-pointer">Peso Colombiano (COP)</SelectItem>
                                    </SelectContent>
                                  </Select>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              </motion.div>

              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: 0.3 }}
              >
                  <Card className="bg-[#0A0A0A] border-white/5 rounded-[32px] overflow-hidden">
                      <CardHeader className="border-b border-white/5 pb-6 pt-8 px-8">
                          <CardTitle className="text-sm font-light tracking-widest text-white/50 uppercase flex items-center gap-3">
                              <Key className="w-5 h-5 text-amber-500" />
                              API Keys & Integraciones Maestras
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
                          <div className="space-y-3">
                              <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Stripe Secret Key (Cobros B2B)</label>
                              <div className="relative">
                                  <Input type="password" defaultValue="sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx" className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50 pr-12" />
                                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                      <RefreshCcw className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                          <div className="space-y-3">
                              <label className="text-xs font-headline tracking-widest text-white/40 uppercase">Twilio API Key (Global SMS Engine)</label>
                              <div className="relative">
                                  <Input type="password" defaultValue="tw_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx" className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-amber-500/50 pr-12" />
                                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                      <RefreshCcw className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              </motion.div>

          </div>

          {/* Danger Zone Sidebar */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.6, delay: 0.4 }}
             className="space-y-6"
          >
              <Card className="bg-amber-950/20 border-amber-500/20 rounded-[32px] overflow-hidden">
                  <CardHeader className="border-b border-amber-500/10 pb-6 pt-8 px-8">
                      <CardTitle className="text-sm font-headline tracking-widest text-amber-500 uppercase flex items-center gap-3">
                          <ShieldAlert className="w-5 h-5" />
                          Danger Zone
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                      
                      <div className="space-y-2">
                          <h4 className="text-white font-medium text-sm">Modo Mantenimiento</h4>
                          <p className="text-xs text-white/40 font-light">
                              Impide que cualquier usuario (incluidos Tenants) inicie sesión en la plataforma.
                          </p>
                          <button className="mt-2 w-full py-3 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-headline tracking-widest uppercase hover:bg-amber-500/10 transition-colors">
                              Activar Mantenimiento
                          </button>
                      </div>

                      <div className="w-full h-px bg-amber-500/10" />

                      <div className="space-y-2">
                          <h4 className="text-white font-medium text-sm">Purgar Cache Global</h4>
                          <p className="text-xs text-white/40 font-light">
                              Limpia la memoria caché de Redis para todos los Tenants. Puede causar lentitud temporal.
                          </p>
                          <button className="mt-2 w-full py-3 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-headline tracking-widest uppercase hover:bg-amber-500/10 transition-colors">
                              Limpiar Cache
                          </button>
                      </div>

                  </CardContent>
              </Card>


          </motion.div>
      </div>

    </div>
  );
}
