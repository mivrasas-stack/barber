"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, ShieldAlert, Key, RefreshCcw, Save, Server, Eye, EyeOff } from 'lucide-react';

const FuturisticToggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <button 
    onClick={onToggle}
    className={`relative w-16 h-8 rounded-full transition-all duration-500 ease-out border outline-none ${
      active ? 'bg-amber-500/20 border-amber-500/50' : 'bg-black/40 border-white/10 hover:border-white/20'
    }`}
  >
    <motion.div 
      layout
      className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center ${
        active ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-white/20'
      }`}
      animate={{ x: active ? 32 : 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    />
  </button>
);

const FuturisticInput = ({ label, defaultValue, type = "text", ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-3">
      <label className="text-[10px] md:text-xs font-headline tracking-[0.2em] text-white/40 uppercase">{label}</label>
      <div className="relative group">
        <input 
          type={actualType}
          defaultValue={defaultValue}
          className="w-full bg-black/20 border border-white/5 text-white/90 h-14 rounded-2xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 backdrop-blur-xl px-5 transition-all outline-none font-light placeholder:text-white/20 text-sm md:text-base"
          {...props}
        />
        {isPassword && (
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default function SaaSGlobalSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  return (
    <div className="min-h-screen bg-[#050505] selection:bg-amber-500/30">
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 py-12 pb-32 space-y-16">
        
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
              <div className="flex items-center gap-4">
                 <div className="h-[2px] w-12 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                 <span className="text-amber-500 font-headline tracking-[0.4em] text-[10px] md:text-xs uppercase font-semibold">Configuración Root</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-headline text-white tracking-widest uppercase font-light">
                Ajustes <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-600">Globales</span>
              </h1>
              <p className="text-white/40 font-light tracking-wide max-w-2xl text-sm md:text-base leading-relaxed">
                Panel de control maestro. Configura los parámetros críticos que rigen la experiencia y operación de todos los inquilinos conectados a la infraestructura global.
              </p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="flex-shrink-0"
          >
              <button className="group relative h-14 px-8 flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:text-amber-300 font-medium tracking-[0.15em] text-sm rounded-2xl overflow-hidden transition-all duration-500 hover:bg-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <Save className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                  <span className="relative z-10 uppercase font-headline">Guardar Cambios</span>
              </button>
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
            
            {/* Platform & Brand */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
               className="lg:col-span-8 relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-[40px] pointer-events-none" />
                <div className="h-full bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-white/10 transition-colors duration-500 rounded-[40px] p-8 md:p-12 overflow-hidden relative">
                    {/* Glowing Orb */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-700" />
                    
                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                          <Globe className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                          <h2 className="text-white text-lg md:text-xl font-headline tracking-[0.15em] uppercase">Plataforma & Marca Blanca</h2>
                          <p className="text-white/30 text-xs md:text-sm tracking-wide mt-1">Identidad global y localización</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <FuturisticInput label="Nombre del SaaS" defaultValue="Barber Paradise Platform" />
                        <FuturisticInput label="Dominio Principal" defaultValue="app.barberparadise.com" />
                        <FuturisticInput label="Email de Soporte Global" defaultValue="support@barberparadise.com" type="email" />
                        
                        <div className="space-y-3">
                            <label className="text-[10px] md:text-xs font-headline tracking-[0.2em] text-white/40 uppercase">Moneda Base Global</label>
                            <div className="relative">
                              <select className="w-full bg-black/20 border border-white/5 text-white/90 h-14 rounded-2xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 backdrop-blur-xl px-5 transition-all outline-none font-light text-sm md:text-base appearance-none cursor-pointer">
                                <option value="USD" className="bg-neutral-900 text-white">Dólar Estadounidense (USD)</option>
                                <option value="COP" className="bg-neutral-900 text-white">Peso Colombiano (COP)</option>
                                <option value="EUR" className="bg-neutral-900 text-white">Euro (EUR)</option>
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div 
               initial={{ opacity: 0, x: 30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
               className="lg:col-span-4 flex flex-col gap-8"
            >
                {/* Maintenance Card */}
                <div className="flex-1 bg-amber-950/10 backdrop-blur-3xl border border-amber-500/10 hover:border-amber-500/20 transition-all duration-500 rounded-[40px] p-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <h3 className="text-white text-sm md:text-base font-headline tracking-[0.1em] uppercase">Mantenimiento</h3>
                        </div>
                        <FuturisticToggle active={maintenanceMode} onToggle={() => setMaintenanceMode(!maintenanceMode)} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-white/40 text-sm font-light leading-relaxed">
                            Cierra el acceso a la plataforma para todos los inquilinos. Solo los administradores root podrán acceder.
                        </p>
                        {maintenanceMode && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Sistema Inaccesible
                          </motion.div>
                        )}
                    </div>
                </div>

                {/* Cache Card */}
                <div className="flex-1 bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-white/10 transition-colors duration-500 rounded-[40px] p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <Server className="w-5 h-5 text-white/50" />
                            <h3 className="text-white text-sm md:text-base font-headline tracking-[0.1em] uppercase">Purgar Caché</h3>
                        </div>
                        <p className="text-white/40 text-xs md:text-sm font-light">
                            Limpia la memoria Redis para refrescar los datos globales de todos los Tenants de forma forzosa.
                        </p>
                    </div>
                    <button className="mt-8 w-full py-4 rounded-2xl border border-white/10 text-white/60 text-xs font-headline tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white transition-all duration-300">
                        Ejecutar Purga
                    </button>
                </div>
            </motion.div>

            {/* API Keys */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
               className="lg:col-span-12"
            >
                <div className="bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-white/10 transition-colors duration-500 rounded-[40px] p-8 md:p-12">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                          <Key className="w-6 h-6 text-white/70" />
                        </div>
                        <div>
                          <h2 className="text-white text-lg md:text-xl font-headline tracking-[0.15em] uppercase">Integraciones Maestras</h2>
                          <p className="text-white/30 text-xs md:text-sm tracking-wide mt-1">Credenciales de proveedores de infraestructura</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <FuturisticInput 
                          label="Stripe Secret Key (B2B SaaS)" 
                          defaultValue="tu_clave_secreta_de_stripe" 
                          type="password" 
                        />
                        <div className="relative">
                            <FuturisticInput 
                              label="Twilio Auth Token (Global SMS)" 
                              defaultValue="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                              type="password" 
                            />
                            <button className="absolute right-16 top-[42px] p-2 text-white/30 hover:text-amber-400 hover:rotate-180 transition-all duration-500">
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

        </div>
      </div>
    </div>
  );
}
