"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Filter, MoreHorizontal, ShieldCheck, ShieldAlert, Eye, Edit, BarChart, Trash2 } from 'lucide-react';
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
];

type Tenant = typeof initialTenantsData[0];

export default function TenantsPage() {
  const [tenantsData, setTenantsData] = useState<Tenant[]>(initialTenantsData);
  const [dialogState, setDialogState] = useState<{ type: 'details' | 'edit' | null, tenant: Tenant | null }>({ type: null, tenant: null });
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
          .header { background-color: #0a0a0a; color: #f59e0b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
          .date { color: #fff; font-size: 12px; margin-top: 10px; font-weight: normal; }
          .section { margin-top: 30px; }
          .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #f59e0b; padding-bottom: 5px; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
          .info-item strong { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background-color: #f59e0b; color: #000; text-align: left; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { border-bottom: 1px solid #eee; padding: 12px; }
          tr:nth-child(even) { background-color: #f9f9f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .summary-card { background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; }
          @media print {
            body { padding: 0; }
            .header { border-radius: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte Financiero</h1>
          <div class="date">Fecha de Emisión: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Datos de la Franquicia</div>
          <div class="info-grid">
            <div class="info-item"><strong>Barbería:</strong> ${tenant.name}</div>
            <div class="info-item"><strong>Propietario:</strong> ${tenant.owner}</div>
            <div class="info-item"><strong>Ubicación:</strong> ${tenant.location}</div>
            <div class="info-item"><strong>Plan Actual:</strong> ${tenant.plan}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Resumen del Mes</div>
          <div class="summary-card">
            <div class="info-grid">
              <div class="info-item"><strong>Ingresos Brutos:</strong> $ 4,500.00 USD</div>
              <div class="info-item"><strong>Comisiones (10%):</strong> $ 450.00 USD</div>
              <div class="info-item" style="font-size: 16px; color: #000; font-weight: bold; margin-top: 10px;"><strong>Total Neto a Liquidar:</strong> $ 4,050.00 USD</div>
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
               <span className="text-amber-500 font-headline tracking-[0.3em] text-xs uppercase">Gestión de Inquilinos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-headline text-white tracking-widest uppercase">
              Franquicias <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">(Tenants)</span>
            </h1>
            <p className="text-white/40 font-light mt-4 tracking-wide max-w-xl text-sm">
              Administración global de todas las barberías que utilizan la plataforma. Visualiza estados, planes y suspende accesos si es necesario.
            </p>
        </motion.div>
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
                      placeholder="Buscar por nombre, dueño o ciudad..." 
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
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Barbería</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Propietario / Ubicación</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Plan Actual</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase">Estado</th>
                          <th className="px-8 py-6 text-xs font-headline tracking-widest text-white/40 uppercase text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {tenantsData.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                                          <Building2 className={`w-4 h-4 ${tenant.status === 'Active' ? 'text-amber-400' : 'text-white/30'}`} />
                                      </div>
                                      <div>
                                          <p className="font-headline tracking-wide text-white group-hover:text-amber-300 transition-colors">{tenant.name}</p>
                                          <p className="text-[10px] font-light text-white/30 mt-1">Suscrito: {tenant.date}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <p className="text-sm font-medium text-white/80">{tenant.owner}</p>
                                  <p className="text-xs font-light text-white/40 mt-1">{tenant.location}</p>
                              </td>
                              <td className="px-8 py-6">
                                  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] font-headline tracking-widest text-white/70 uppercase border border-white/10">
                                      {tenant.plan}
                                  </span>
                              </td>
                              <td className="px-8 py-6">
                                  {tenant.status === 'Active' ? (
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                                          <span className="text-[10px] font-medium text-green-500 uppercase tracking-widest">Activo</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                                          <span className="text-[10px] font-medium text-amber-500 uppercase tracking-widest">Suspendido</span>
                                      </div>
                                  )}
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
                                            onClick={() => setDialogState({ type: 'details', tenant })}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Eye className="w-4 h-4 text-amber-500" />
                                              <span>Ver Detalles</span>
                                          </DropdownMenuItem>
                                          
                                          <DropdownMenuItem 
                                            onClick={() => setDialogState({ type: 'edit', tenant })}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Edit className="w-4 h-4 text-blue-500" />
                                              <span>Editar Información</span>
                                          </DropdownMenuItem>
                                          
                                          <DropdownMenuItem 
                                            onClick={() => handleFinancialReport(tenant)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <BarChart className="w-4 h-4 text-purple-500" />
                                              <span>Reporte Financiero</span>
                                          </DropdownMenuItem>
                                          
                                          <DropdownMenuSeparator className="bg-white/10" />
                                          
                                          {tenant.status === 'Active' ? (
                                            <DropdownMenuItem 
                                              onClick={() => handleSuspendToggle(tenant.id)}
                                              className="flex items-center gap-2 cursor-pointer hover:bg-amber-500/10 focus:bg-amber-500/10 text-amber-500 text-sm py-2 rounded-lg transition-colors"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                                <span>Suspender Acceso</span>
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem 
                                              onClick={() => handleSuspendToggle(tenant.id)}
                                              className="flex items-center gap-2 cursor-pointer hover:bg-green-500/10 focus:bg-green-500/10 text-green-500 text-sm py-2 rounded-lg transition-colors"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Activar Acceso</span>
                                            </DropdownMenuItem>
                                          )}
                                          
                                          <DropdownMenuItem 
                                            onClick={() => handleDelete(tenant.id)}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-500 text-sm py-2 rounded-lg transition-colors"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                              <span>Eliminar Franquicia</span>
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

      {/* Dialogs */}
      <Dialog 
        open={dialogState.type !== null} 
        onOpenChange={(isOpen) => !isOpen && setDialogState({ type: null, tenant: null })}
      >
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-500 font-headline tracking-wider">
              {dialogState.type === 'details' ? 'Detalles de Franquicia' : 'Editar Información'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {dialogState.type === 'details' 
                ? 'Información completa del inquilino seleccionado.' 
                : 'Modifica los datos básicos del inquilino.'}
            </DialogDescription>
          </DialogHeader>

          {dialogState.tenant && dialogState.type === 'details' && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Nombre</p>
                  <p className="font-medium">{dialogState.tenant.name}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Propietario</p>
                  <p className="font-medium">{dialogState.tenant.owner}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Ubicación</p>
                  <p className="font-medium">{dialogState.tenant.location}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Plan</p>
                  <p className="font-medium text-amber-400">{dialogState.tenant.plan}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Estado</p>
                  <p className={dialogState.tenant.status === 'Active' ? 'text-green-400' : 'text-amber-400'}>
                    {dialogState.tenant.status === 'Active' ? 'Activo' : 'Suspendido'}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 mb-1 text-xs uppercase tracking-wider">Fecha Suscripción</p>
                  <p className="font-medium">{dialogState.tenant.date}</p>
                </div>
              </div>
            </div>
          )}

          {dialogState.tenant && dialogState.type === 'edit' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">Nombre de la Barbería</label>
                <Input defaultValue={dialogState.tenant.name} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">Propietario</label>
                <Input defaultValue={dialogState.tenant.owner} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">Ubicación</label>
                <Input defaultValue={dialogState.tenant.location} className="bg-white/5 border-white/10" />
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setDialogState({ type: null, tenant: null })}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              Cerrar
            </Button>
            {dialogState.type === 'edit' && (
              <Button 
                onClick={() => {
                  toast({ title: "Guardado", description: "Los cambios han sido guardados exitosamente." });
                  setDialogState({ type: null, tenant: null });
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                Guardar Cambios
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
