"use client";
import React, { useState, useEffect } from 'react';
import { Search, Star, History, Users, QrCode, Sparkles, Phone, Mail, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { getStoredCustomers, Customer } from '@/lib/customer-store';
import QRCode from 'qrcode';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataDataUrl, setQrDataUrl] = useState<string>('');
  const [qrRegistrationUrl, setQrRegistrationUrl] = useState<string>('');

  const loadCustomers = () => {
    setCustomers(getStoredCustomers());
  };

  useEffect(() => {
    loadCustomers();

    // Generate QR code link targeting the QR registration route
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const registerUrl = `${origin}/qr-register`;
    setQrRegistrationUrl(registerUrl);

    QRCode.toDataURL(registerUrl, { width: 300, margin: 2, color: { dark: '#3b82f6', light: '#090d16' } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));

    const handleStorage = () => loadCustomers();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 relative pb-20">
      <div className="fixed top-0 left-0 w-[50vw] h-[50vw] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 mix-blend-screen" />
      
      <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center hidden sm:flex shadow-2xl">
            <Users className="w-8 h-8 text-foreground/80" />
          </div>
          <div>
            <p className="text-blue-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Directorio VIP</p>
            <h2 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">Clientes</span></h2>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-10">
          <Button 
            onClick={() => setIsQrOpen(true)}
            className="h-14 px-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-headline tracking-widest text-xs uppercase shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 border border-blue-400/30 transition-all"
          >
            <QrCode className="w-5 h-5" />
            Código QR de Registro
          </Button>

          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Buscar por nombre o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 bg-card/80 border-border text-foreground rounded-3xl focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 backdrop-blur-md h-14 font-light tracking-wide shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
        {filtered.map((customer, index) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            key={customer.id} 
            className="group relative overflow-hidden rounded-[24px] bg-card border border-border hover:border-blue-500/30 transition-all duration-500 p-6 flex flex-col justify-between shadow-lg hover:bg-foreground/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex flex-col gap-6 relative z-10 h-full">
              <div className="flex justify-between items-start">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Avatar className="relative h-16 w-16 border border-border group-hover:border-blue-500/30 ring-4 ring-black/50 shadow-2xl transition-all duration-500 bg-muted">
                    <AvatarFallback className="bg-transparent text-foreground/80 text-lg font-headline">{customer.avatar}</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border">
                    <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                    <span className="text-xs font-medium text-foreground/80">{customer.rating}</span>
                  </div>
                  {customer.isQrRegistered ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-headline uppercase tracking-widest">
                      <Sparkles className="w-2.5 h-2.5" /> Vía QR
                    </span>
                  ) : (
                    <span className="text-[10px] text-foreground/30 uppercase tracking-widest font-headline px-2">LTV: Alto</span>
                  )}
                </div>
              </div>
              
              <div className="mt-auto">
                <h3 className="font-headline text-foreground tracking-widest text-xl group-hover:text-blue-100 transition-colors">{customer.name}</h3>
                
                {customer.phone && (
                  <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1.5 font-light">
                    <Phone className="w-3 h-3 text-blue-400" /> {customer.phone}
                  </p>
                )}

                {customer.email && (
                  <p className="text-xs text-foreground/40 mt-0.5 flex items-center gap-1.5 font-light">
                    <Mail className="w-3 h-3 text-foreground/30" /> {customer.email}
                  </p>
                )}
                
                <div className="w-full h-px bg-gradient-to-r from-foreground/10 to-transparent my-4" />
                
                <div className="flex w-full justify-between items-center text-xs text-foreground/40">
                  <div className="flex items-center gap-2 group-hover:text-foreground/60 transition-colors">
                    <History className="w-3.5 h-3.5" />
                    <span className="font-light">{customer.lastVisit}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-foreground/5 border border-border uppercase tracking-[0.2em] font-medium text-[9px] group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                    {customer.visits} {customer.visits === 1 ? 'Visita' : 'Visitas'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="w-full py-32 flex flex-col items-center justify-center text-foreground/20 bg-card rounded-[40px] border border-border mt-8">
          <Search className="w-16 h-16 mb-6 opacity-30" />
          <p className="font-headline tracking-[0.2em] text-lg uppercase">No se encontraron clientes</p>
        </div>
      )}

      {/* QR Code Modal for Barber */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 border-border backdrop-blur-2xl rounded-3xl p-6 text-foreground">
          <DialogHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-1">
              <QrCode className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-headline tracking-wider uppercase text-center">
              Código QR de la Barbería
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/60 text-center">
              Muestra o imprime este código QR en el mostrador. Los clientes que lo escaneen llenarán un formulario rápido y aparecerán automáticamente aquí.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 bg-background/50 border border-border/80 rounded-2xl my-4">
            {qrDataDataUrl ? (
              <img src={qrDataDataUrl} alt="Código QR Registro Cliente" className="w-56 h-56 rounded-xl border border-blue-500/30 shadow-2xl p-2 bg-[#090d16]" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-foreground/40">Generando QR...</div>
            )}

            <p className="text-[11px] text-foreground/50 mt-4 break-all text-center font-mono bg-muted/60 px-3 py-1.5 rounded-lg border border-border/50">
              {qrRegistrationUrl}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              asChild
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 text-white font-headline text-xs uppercase tracking-wider"
            >
              <a href={qrRegistrationUrl} target="_blank" rel="noopener noreferrer">
                Probar Enlace de Registro
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsQrOpen(false)}
              className="h-12 px-5 rounded-xl border-border hover:bg-muted text-xs font-headline uppercase"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
