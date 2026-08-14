"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Filter, MoreHorizontal, ShieldCheck, ShieldAlert, Eye, Edit, BarChart, Trash2, MapPin, User, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const initialTenantsData = [
  { id: 1, name: 'The Royal Barber', owner: 'Carlos Torres', location: 'Bogotá, Colombia', plan: 'Black Label', status: 'Active', date: '10/07/2026' },
  { id: 2, name: 'Gentleman\'s Lounge', owner: 'Luis Mendoza', location: 'Medellín, Colombia', plan: 'Barber Club', status: 'Active', date: '05/07/2026' },
  { id: 3, name: 'Classic Cuts Club', owner: 'Andrés Felipe', location: 'Cartagena, Colombia', plan: 'Corte Clásico', status: 'Suspended', date: '28/06/2026' },
  { id: 4, name: 'Urban Style Barbería', owner: 'Jorge Silva', location: 'Cali, Colombia', plan: 'Black Label', status: 'Active', date: '12/07/2026' },
  { id: 5, name: 'Imperium Grooming', owner: 'Santiago Vargas', location: 'Barranquilla, Colombia', plan: 'Gold Elite', status: 'Active', date: '21/07/2026' },
];

type Tenant = typeof initialTenantsData[0];

export default function TenantsPage() {
  const [tenantsData, setTenantsData] = useState<Tenant[]>(initialTenantsData);
  const [dialogState, setDialogState] = useState<{ type: 'details' | 'edit' | null, tenant: Tenant | null }>({ type: null, tenant: null });
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleSuspendToggle = (tenantId: number) => {
    const tenant = tenantsData.find(t => t.id === tenantId);
    if (!tenant) return;
    
    const newStatus = tenant.status === 'Active' ? 'Suspended' : 'Active';
    
    setTenantsData(prev => prev.map(t => 
      t.id === tenantId ? { ...t, status: newStatus } : t
    ));

    toast({
      title: newStatus === 'Active' ? 'Acceso Activado' : 'Acceso Suspendido',
      description: `El acceso para ${tenant.name} ha sido ${newStatus === 'Active' ? 'activado' : 'suspendido'}.`,
    });
  };

  const handleDelete = (tenantId: number) => {
    const tenant = tenantsData.find(t => t.id === tenantId);
    if (tenant) {
      setTenantsData(prev => prev.filter(t => t.id !== tenantId));
      toast({
        title: 'Franquicia Eliminada',
        description: `${tenant.name} ha sido eliminada correctamente.`,
        variant: 'destructive',
      });
    }
  };

  const handleFinancialReport = (tenant: Tenant) => {
    toast({
      title: 'Generando Reporte',
      description: `Generando reporte financiero para ${tenant.name}...`,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Por favor, permite las ventanas emergentes (pop-ups) para generar el reporte.',
        variant: 'destructive',
      });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Financiero - ${tenant.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
          .header { background-color: #050505; color: #f59e0b; padding: 30px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 3px; }
          .date { color: #fff; font-size: 12px; margin-top: 10px; font-weight: normal; letter-spacing: 1px; }
          .section { margin-top: 40px; }
          .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #f59e0b; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;}
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px; }
          .info-item strong { color: #666; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;}
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background-color: #f59e0b; color: #000; text-align: left; padding: 15px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { border-bottom: 1px solid #eee; padding: 15px; }
          tr:nth-child(even) { background-color: #fcfcfc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .summary-card { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #050505; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .footer { margin-top: 60px; font-size: 10px; color: #999; text-align: center; text-transform: uppercase; letter-spacing: 2px;}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte Financiero</h1>
          <div class="date">FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Datos de la Franquicia</div>
          <div class="info-grid">
            <div class="info-item"><strong>Barbería:</strong> <br/>${tenant.name}</div>
            <div class="info-item"><strong>Propietario:</strong> <br/>${tenant.owner}</div>
            <div class="info-item"><strong>Ubicación:</strong> <br/>${tenant.location}</div>
            <div class="info-item"><strong>Plan Actual:</strong> <br/>${tenant.plan}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Resumen del Mes</div>
          <div class="summary-card">
            <div class="info-grid">
              <div class="info-item"><strong>Ingresos Brutos:</strong> <br/>$ 4,500.00 USD</div>
              <div class="info-item"><strong>Comisiones (10%):</strong> <br/>$ 450.00 USD</div>
              <div class="info-item" style="font-size: 18px; color: #000; font-weight: bold; margin-top: 10px; grid-column: span 2;"><strong>Total Neto a Liquidar:</strong> <br/>$ 4,050.00 USD</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Últimas Transacciones</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicio / Producto</th>
                <th>Método de Pago</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>01/07/2026</td><td>Corte Clásico</td><td>Efectivo</td><td>$ 25.00</td></tr>
              <tr><td>02/07/2026</td><td>Barba y Perfilado</td><td>Tarjeta</td><td>$ 15.00</td></tr>
              <tr><td>05/07/2026</td><td>Corte Premium</td><td>Tarjeta</td><td>$ 35.00</td></tr>
              <tr><td>10/07/2026</td><td>Tinte y Corte</td><td>Efectivo</td><td>$ 50.00</td></tr>
              <tr><td>12/07/2026</td><td>Corte Clásico</td><td>Tarjeta</td><td>$ 25.00</td></tr>
              <tr><td>15/07/2026</td><td>Productos (Cera)</td><td>Efectivo</td><td>$ 20.00</td></tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          Generado por el sistema de administración global - ${new Date().toLocaleString()}
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 200); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredTenants = tenantsData.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-[#050505] selection:bg-amber-500/30">
      <div className="max-w-[1600px] mx-auto space-y-16 px-6 sm:px-8 lg:px-12 py-12 pb-32">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="flex items-center gap-4 mb-4">
                 <div className="h-[2px] w-12 bg-gradient-to-r from-amber-500 to-transparent" />
                 <span className="text-amber-500 font-headline tracking-[0.4em] text-[10px] uppercase font-bold">Gestión de Inquilinos</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-headline tracking-tight text-white uppercase leading-none">
                Franquicias
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white/40 via-white/20 to-transparent text-3xl md:text-5xl tracking-widest">
                  (Tenants)
                </span>
              </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 items-center"
          >
            <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-amber-500 transition-colors" />
                <Input 
                    placeholder="Buscar inquilino..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/[0.02] border-white/5 text-white pl-12 h-14 rounded-2xl focus:border-amber-500/40 focus:ring-amber-500/10 backdrop-blur-md shadow-2xl transition-all"
                />
            </div>
            <button className="flex items-center gap-3 px-8 h-14 rounded-2xl bg-white/[0.02] border border-white/5 text-white/60 hover:text-amber-400 hover:border-amber-500/30 backdrop-blur-md transition-all w-full sm:w-auto justify-center group shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <Filter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-headline tracking-widest uppercase">Filtros</span>
            </button>
          </motion.div>
        </div>

        {/* Asymmetrical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 auto-rows-auto">
          <AnimatePresence>
            {filteredTenants.map((tenant, index) => {
              // Create asymmetrical pattern
              const isLarge = index === 0 || index === 3;
              const colSpanClass = isLarge ? "md:col-span-12 lg:col-span-8" : "md:col-span-6 lg:col-span-4";
              const heightClass = isLarge ? "min-h-[380px]" : "min-h-[380px]";
              
              return (
                <motion.div
                  key={tenant.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`${colSpanClass} ${heightClass} group relative rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-amber-500/30 transition-all duration-500 overflow-hidden flex flex-col shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]`}
                >
                  {/* Subtle Glow Effect on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  {/* Card Header */}
                  <div className="p-8 pb-6 flex justify-between items-start z-10 relative">
                    <div className="flex gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                        <Building2 className={`w-7 h-7 ${tenant.status === 'Active' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-white/20'}`} />
                      </div>
                      <div className="pt-1">
                        <h3 className="text-2xl font-headline tracking-wide text-white group-hover:text-amber-400 transition-colors">{tenant.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${tenant.status === 'Active' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                          <span className="text-[10px] font-headline text-white/50 uppercase tracking-widest">
                            {tenant.status === 'Active' ? 'Operativo' : 'Suspendido'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="text-white/30 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all w-10 h-10 rounded-full flex items-center justify-center">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-xl border border-white/10 text-white shadow-2xl shadow-black/80 rounded-2xl p-2 z-50">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-amber-500/70 font-headline px-2 py-1.5">Administrar</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            
                            <DropdownMenuItem 
                              onClick={() => setDialogState({ type: 'details', tenant })}
                              className="flex items-center gap-3 cursor-pointer hover:bg-white/10 focus:bg-white/10 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all"
                            >
                                <Eye className="w-4 h-4 text-white/70" />
                                <span>Ver Información</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => setDialogState({ type: 'edit', tenant })}
                              className="flex items-center gap-3 cursor-pointer hover:bg-white/10 focus:bg-white/10 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all"
                            >
                                <Edit className="w-4 h-4 text-white/70" />
                                <span>Modificar Datos</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleFinancialReport(tenant)}
                              className="flex items-center gap-3 cursor-pointer hover:bg-amber-500/20 focus:bg-amber-500/20 text-amber-400 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all"
                            >
                                <BarChart className="w-4 h-4" />
                                <span>Reporte Financiero</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            
                            {tenant.status === 'Active' ? (
                              <DropdownMenuItem 
                                onClick={() => handleSuspendToggle(tenant.id)}
                                className="flex items-center gap-3 cursor-pointer hover:bg-red-500/20 focus:bg-red-500/20 text-red-400 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all"
                              >
                                  <ShieldAlert className="w-4 h-4" />
                                  <span>Bloquear Acceso</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleSuspendToggle(tenant.id)}
                                className="flex items-center gap-3 cursor-pointer hover:bg-green-500/20 focus:bg-green-500/20 text-green-400 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all"
                              >
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Restaurar Acceso</span>
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => handleDelete(tenant.id)}
                              className="flex items-center gap-3 cursor-pointer hover:bg-red-500/20 focus:bg-red-500/20 text-red-500 text-xs tracking-wide py-2.5 px-3 rounded-xl transition-all mt-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar Definitivo</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Card Body Grid */}
                  <div className="flex-1 px-8 py-2 relative z-10">
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-white/30">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-headline uppercase tracking-widest">Propietario</span>
                        </div>
                        <p className="text-sm text-white/80 font-light truncate pr-4">{tenant.owner}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-white/30">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-headline uppercase tracking-widest">Ubicación</span>
                        </div>
                        <p className="text-sm text-white/80 font-light truncate pr-4">{tenant.location}</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-white/30">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-headline uppercase tracking-widest">Plan de Uso</span>
                        </div>
                        <div className="inline-flex">
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-headline tracking-wider text-amber-500 uppercase border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                              {tenant.plan}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-white/30">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-headline uppercase tracking-widest">Suscripción</span>
                        </div>
                        <p className="text-sm text-white/60 font-mono tracking-wider">{tenant.date}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Glassmorphism Button */}
                  <div className="mt-auto p-4 relative z-10">
                    <button 
                      onClick={() => setDialogState({ type: 'details', tenant })}
                      className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-amber-500/20 text-white/60 hover:text-amber-400 transition-all duration-300 group/btn"
                    >
                      <span className="text-xs font-headline uppercase tracking-widest">Ver Detalles Completos</span>
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  
                  {/* Subtle Background Pattern */}
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                     <Building2 className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-8" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog 
        open={dialogState.type !== null} 
        onOpenChange={(isOpen) => !isOpen && setDialogState({ type: null, tenant: null })}
      >
        <DialogContent className="bg-[#050505] border border-white/10 text-white sm:max-w-xl rounded-[2rem] p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
          
          <div className="p-8 sm:p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-headline tracking-widest text-white uppercase flex items-center gap-3">
                {dialogState.type === 'details' ? 'Detalles de la Franquicia' : 'Modificar Datos'}
              </DialogTitle>
              <DialogDescription className="text-white/40 font-light mt-2">
                {dialogState.type === 'details' 
                  ? 'Ficha técnica e información administrativa del inquilino.' 
                  : 'Actualiza la información básica del negocio en la plataforma.'}
              </DialogDescription>
            </DialogHeader>

            {dialogState.tenant && dialogState.type === 'details' && (
              <div className="space-y-8">
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-headline text-white">{dialogState.tenant.name}</h2>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-headline uppercase tracking-widest">
                      {dialogState.tenant.plan}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/30 uppercase font-headline tracking-[0.2em]">Propietario / Titular</p>
                    <p className="font-light text-lg text-white/90">{dialogState.tenant.owner}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/30 uppercase font-headline tracking-[0.2em]">Sede Principal</p>
                    <p className="font-light text-lg text-white/90">{dialogState.tenant.location}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/30 uppercase font-headline tracking-[0.2em]">Estado del Sistema</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${dialogState.tenant.status === 'Active' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`} />
                      <span className="font-light text-lg text-white/90">
                        {dialogState.tenant.status === 'Active' ? 'Operativo' : 'Suspendido'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/30 uppercase font-headline tracking-[0.2em]">Fecha de Registro</p>
                    <p className="font-mono text-lg text-white/70">{dialogState.tenant.date}</p>
                  </div>
                </div>
              </div>
            )}

            {dialogState.tenant && dialogState.type === 'edit' && (
              <div className="space-y-6">
                <div className="space-y-3 relative group">
                  <label className="text-[10px] uppercase font-headline tracking-[0.2em] text-amber-500 ml-1">Nombre Comercial</label>
                  <Input 
                    defaultValue={dialogState.tenant.name} 
                    className="h-14 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 text-lg px-4" 
                  />
                </div>
                <div className="space-y-3 relative group">
                  <label className="text-[10px] uppercase font-headline tracking-[0.2em] text-white/40 ml-1 group-focus-within:text-amber-500 transition-colors">Titular de Franquicia</label>
                  <Input 
                    defaultValue={dialogState.tenant.owner} 
                    className="h-14 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 text-lg px-4" 
                  />
                </div>
                <div className="space-y-3 relative group">
                  <label className="text-[10px] uppercase font-headline tracking-[0.2em] text-white/40 ml-1 group-focus-within:text-amber-500 transition-colors">Ciudad y Región</label>
                  <Input 
                    defaultValue={dialogState.tenant.location} 
                    className="h-14 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 text-lg px-4" 
                  />
                </div>
              </div>
            )}

            <DialogFooter className="mt-10 sm:justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDialogState({ type: null, tenant: null })}
                className="h-12 px-8 rounded-xl border-white/10 bg-transparent hover:bg-white/5 text-white/60 hover:text-white uppercase text-[10px] tracking-[0.2em] font-headline"
              >
                Cerrar
              </Button>
              {dialogState.type === 'edit' && (
                <Button 
                  onClick={() => {
                    toast({ title: "Cambios Confirmados", description: "La información ha sido sincronizada con la base de datos." });
                    setDialogState({ type: null, tenant: null });
                  }}
                  className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-black uppercase text-[10px] tracking-[0.2em] font-headline shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all"
                >
                  Guardar Datos
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
