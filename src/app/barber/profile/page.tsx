"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UserCircle, Mail, Phone, MapPin, Camera, Save, Settings,
  Images, Upload, X, ImagePlus, Sparkles, Crown, Zap, Check, ArrowRight,
  QrCode, Download, Copy, Share2, Users, HeartHandshake, CheckCircle2, ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/ui/premium-button';
import { dummyBarbers } from '@/app/clientes/data';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredCustomers, registerCustomerViaQr } from '@/lib/customer-store';

const MAX_PHOTOS = 10;

/* ─────────────────────────────── MODAL ─────────────────────────────── */
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const plans = [
    {
      name: 'Pro',
      price: '$4.99',
      period: '/mes',
      photos: '25 fotos',
      color: 'from-amber-500 to-orange-500',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20',
      badge: null,
      features: ['25 fotos en galería', 'Calidad HD', 'Prioridad en búsquedas'],
    },
    {
      name: 'Elite',
      price: '$9.99',
      period: '/mes',
      photos: 'Fotos ilimitadas',
      color: 'from-purple-500 to-pink-500',
      border: 'border-purple-500/40',
      glow: 'shadow-purple-500/20',
      badge: 'Más popular',
      features: ['Fotos ilimitadas', 'Calidad 4K', 'Portafolio destacado', 'Estadísticas avanzadas'],
    },
  ];

  return (
    /* Backdrop */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 30 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative z-10 w-full max-w-lg bg-background border border-border rounded-[28px] p-6 md:p-8 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 blur-[70px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 blur-[70px] rounded-full pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-all z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & header */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-black" />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-headline tracking-widest uppercase text-foreground">
            Amplía tu Galería
          </h2>
          <p className="text-foreground/50 font-light text-sm tracking-wide mt-3 max-w-xs leading-relaxed">
            Has alcanzado el límite de <span className="text-amber-400 font-medium">{MAX_PHOTOS} fotos</span> del plan gratuito. Actualiza tu plan para agregar más fotos y destacar tu trabajo.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[20px] border ${plan.border} bg-white/[0.03] p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-all duration-300 group cursor-pointer shadow-lg ${plan.glow}`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-foreground text-[10px] font-headline tracking-widest uppercase whitespace-nowrap shadow-lg">
                  <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div>
                <div className={`text-[10px] font-headline tracking-[0.25em] uppercase bg-gradient-to-r ${plan.color} bg-clip-text text-transparent mb-1`}>
                  Plan
                </div>
                <h3 className="text-2xl font-headline tracking-widest text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-headline text-foreground">{plan.price}</span>
                  <span className="text-foreground/40 text-xs font-light">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-foreground/60 text-xs font-light">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0`}>
                      <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button className={`w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r ${plan.color} text-black text-[11px] font-headline tracking-widest uppercase flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all`}>
                Elegir {plan.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div className="flex justify-center relative z-10">
          <button
            onClick={onClose}
            className="text-foreground/30 hover:text-foreground/60 text-xs font-light tracking-widest uppercase transition-colors"
          >
            Continuar con plan gratuito
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────── QR SIMULATION MODAL ───────────────────── */
function ClientAffiliationSimulationModal({
  onClose,
  shopName,
  barberName,
  onAffiliate,
  isSuccess,
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
}: {
  onClose: () => void;
  shopName: string;
  barberName: string;
  onAffiliate: (e: React.FormEvent) => void;
  isSuccess: boolean;
  clientName: string;
  setClientName: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative z-10 w-full max-w-md bg-card border-2 border-amber-500/40 rounded-[32px] p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-headline tracking-widest uppercase text-foreground">
              ¡Bienvenido a la Familia!
            </h3>
            <p className="text-xs text-foreground/60 max-w-xs mx-auto leading-relaxed">
              <strong className="text-amber-400">{clientName}</strong>, te has afiliado exitosamente a <strong className="text-foreground">{shopName}</strong> con tu barbero <strong className="text-amber-400">{barberName}</strong>.
            </p>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-headline tracking-widest uppercase">
              🎉 10% de descuento aplicado en tu próximo corte
            </div>
          </div>
        ) : (
          <form onSubmit={onAffiliate} className="space-y-5 text-left">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-lg mb-2">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-headline tracking-[0.25em] uppercase text-amber-500">
                Experiencia del Cliente
              </span>
              <h3 className="text-2xl font-headline tracking-widest uppercase text-foreground">
                Únete a {shopName}
              </h3>
              <p className="text-xs text-foreground/50 font-light">
                Escaneaste el código de tu barbero <strong>{barberName}</strong>. Completa tus datos para afiliarte a la barbería.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/50">Tu Nombre Completo *</label>
              <Input
                required
                placeholder="Ej. Juan Pérez"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/50">Tu Teléfono / WhatsApp *</label>
              <Input
                required
                placeholder="+57 312 000 0000"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-foreground/5 border border-border text-[11px] text-foreground/60 space-y-1">
              <p className="font-semibold text-foreground/80">Beneficios de Afiliado:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>Prioridad en asignación de citas con {barberName}.</li>
                <li>Descuento del 10% en servicios seleccionados.</li>
                <li>Historial digital de tus estilos y cortes favoritos.</li>
              </ul>
            </div>

            <PremiumButton type="submit" className="w-full h-12 uppercase tracking-widest text-xs font-headline">
              Confirmar Mi Alianza
            </PremiumButton>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────── PAGE ─────────────────────────────── */
export default function ProfilePage() {
  const me = dummyBarbers[0];
  const [photos, setPhotos] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Code State for Owner Barber
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [shopName] = useState('The Royal Barber');
  const [affiliateUrl, setAffiliateUrl] = useState('https://mivra-barber.app/clientes/alianza?barberId=BBR001&shop=The+Royal+Barber');
  const [isCopied, setIsCopied] = useState(false);
  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [clientSimulationName, setClientSimulationName] = useState('');
  const [clientSimulationPhone, setClientSimulationPhone] = useState('');
  const [clientSimulationSuccess, setClientSimulationSuccess] = useState(false);
  const [affiliatedClientsCount, setAffiliatedClientsCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setAffiliatedClientsCount(getStoredCustomers().length);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(affiliateUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).then(url => {
      setQrCodeDataUrl(url);
    }).catch(err => {
      console.error('Error generating QR', err);
    });
  }, [affiliateUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `QR-Alianza-The-Royal-Barber.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSimulationName || !clientSimulationPhone) return;
    registerCustomerViaQr({
      name: clientSimulationName,
      phone: clientSimulationPhone,
    });
    setClientSimulationSuccess(true);
    setAffiliatedClientsCount(getStoredCustomers().length);
    setTimeout(() => {
      setClientSimulationSuccess(false);
      setShowQrScanModal(false);
      setClientSimulationName('');
      setClientSimulationPhone('');
    }, 2800);
  };

  /* Try to open file picker — if full, show upgrade modal */
  const tryOpen = () => {
    if (photos.length >= MAX_PHOTOS) {
      setShowUpgrade(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    if (photos.length >= MAX_PHOTOS) { setShowUpgrade(true); return; }
    const remaining = MAX_PHOTOS - photos.length;
    const fileArray = Array.from(files).slice(0, remaining);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    imageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotos(prev => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, { id: `${Date.now()}-${Math.random()}`, url, name: file.name }];
      });
    });
  }, [photos.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (photos.length >= MAX_PHOTOS) { setShowUpgrade(true); return; }
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleImageDragStart = (e: any, index: number) => {
    setDraggedIdx(index);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragOver = (e: any, index: number) => {
    if (e.preventDefault) e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    setPhotos(prev => {
      const newPhotos = [...prev];
      const draggedItem = newPhotos[draggedIdx];
      newPhotos.splice(draggedIdx, 1);
      newPhotos.splice(index, 0, draggedItem);
      return newPhotos;
    });
    setDraggedIdx(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIdx(null);
  };

  const isFull = photos.length >= MAX_PHOTOS;

  return (
    <>
      {/* ─── Upgrade & QR Simulation Modals ─── */}
      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        {showQrScanModal && (
          <ClientAffiliationSimulationModal
            onClose={() => setShowQrScanModal(false)}
            shopName={shopName}
            barberName={me.name}
            onAffiliate={handleConfirmSimulation}
            isSuccess={clientSimulationSuccess}
            clientName={clientSimulationName}
            setClientName={setClientSimulationName}
            clientPhone={clientSimulationPhone}
            setClientPhone={setClientSimulationPhone}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full min-h-screen animate-in fade-in duration-700 gap-10 relative pb-20">
        <div className="fixed top-0 right-1/4 w-[50vw] h-[50vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center hidden sm:flex shadow-2xl">
              <UserCircle className="w-8 h-8 text-foreground/80" />
            </div>
            <div>
              <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm mb-2">Configuración</p>
              <h2 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
                Mi <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">Perfil</span>
              </h2>
            </div>
          </div>
          <PremiumButton className="relative z-10 w-full sm:w-auto flex items-center justify-center gap-2 h-14 px-8">
            <Save className="w-4 h-4" />
            <span className="tracking-widest text-[10px] sm:text-xs uppercase">Guardar Cambios</span>
          </PremiumButton>
        </div>

        {/* Profile + Form grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
          {/* Profile Card */}
          <div className="lg:col-span-1 rounded-[32px] bg-card border border-border p-8 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative group mt-4">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-[40px] group-hover:bg-amber-500/40 transition-colors duration-700" />
              <Avatar className="relative h-40 w-40 border-2 border-amber-500/20 p-2 bg-black/80 shadow-2xl transition-all duration-700 group-hover:scale-105">
                <AvatarImage src={me.avatarUrl} alt={me.name} className="rounded-full object-cover" />
                <AvatarFallback className="bg-transparent text-foreground font-headline text-5xl">{me.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <button className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg border-2 border-black z-10">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 relative z-10">
              <h3 className="text-2xl font-headline tracking-widest uppercase text-foreground">{me.name}</h3>
              <p className="text-sm font-light tracking-[0.2em] text-amber-500 uppercase mt-1">Master Barber</p>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-4" />
            <div className="w-full space-y-4 text-left relative z-10 mt-4 bg-black/60 p-6 rounded-2xl border border-border shadow-inner">
              <div className="flex items-center gap-4 text-foreground/60 hover:text-foreground transition-colors group/item">
                <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover/item:bg-amber-500/20 group-hover/item:text-amber-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-sm font-light tracking-wide">carlos.m@mivraba.com</span>
              </div>
              <div className="flex items-center gap-4 text-foreground/60 hover:text-foreground transition-colors group/item">
                <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover/item:bg-amber-500/20 group-hover/item:text-amber-500 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm font-light tracking-wide">+1 234 567 8900</span>
              </div>
              <div className="flex items-center gap-4 text-foreground/60 hover:text-foreground transition-colors group/item">
                <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover/item:bg-amber-500/20 group-hover/item:text-amber-500 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-sm font-light tracking-wide">Sucursal Centro</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 rounded-[32px] bg-card border border-border p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700 group-hover:opacity-10">
              <Settings className="w-40 h-40 text-amber-500" />
            </div>
            <h3 className="text-xl font-headline tracking-widest text-foreground uppercase border-b border-border pb-4 relative z-10">Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 ml-2">Nombre Completo</label>
                <Input defaultValue={me.name} className="bg-foreground/5 border-border text-foreground rounded-2xl h-14 px-4 focus-visible:ring-amber-500/50 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 ml-4">Especialidad</label>
                <Input defaultValue="Master Barber" className="bg-foreground/5 border-border text-foreground rounded-2xl h-14 px-4 focus-visible:ring-amber-500/50 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 ml-4">Correo Electrónico</label>
                <Input defaultValue="carlos.m@mivraba.com" type="email" className="bg-foreground/5 border-border text-foreground rounded-2xl h-14 px-4 focus-visible:ring-amber-500/50 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 ml-4">Teléfono</label>
                <Input defaultValue="+1 234 567 8900" type="tel" className="bg-foreground/5 border-border text-foreground rounded-2xl h-14 px-4 focus-visible:ring-amber-500/50 shadow-inner" />
              </div>
              <div className="md:col-span-2 space-y-2 mt-4">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 ml-4">Biografía</label>
                <textarea
                  className="w-full bg-foreground/5 border border-border text-foreground rounded-2xl p-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 min-h-[160px] font-light text-sm shadow-inner resize-none"
                  defaultValue="Especialista en cortes clásicos y arreglos de barba con más de 5 años de experiencia. Apasionado por el detalle y la atención al cliente."
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Código QR de Afiliación & Alianza (Familia Barbería) ── */}
        <div className="relative z-10 rounded-[32px] bg-card border border-border p-8 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700 group-hover:opacity-10">
            <QrCode className="w-48 h-48 text-amber-500" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <HeartHandshake className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-headline tracking-[0.25em] uppercase text-amber-500">Módulo Dueño de Barbería</span>
                </div>
                <h3 className="text-2xl font-headline tracking-widest text-foreground uppercase mt-0.5">
                  Código QR de Alianza & Afiliación
                </h3>
                <p className="text-xs text-foreground/50 font-light tracking-wide mt-1">
                  Genera tu código QR exclusivo para que los clientes lo escaneen en el local y se unan a la familia de tu barbería.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 rounded-2xl bg-foreground/5 border border-border text-center">
                <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-headline block">Clientes Unidos</span>
                <span className="text-xl font-headline text-amber-400 font-bold">{affiliatedClientsCount}</span>
              </div>
            </div>
          </div>

          {/* Grid del QR y Opciones */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
            {/* Visualizador del QR con Branding */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="p-6 rounded-[28px] bg-gradient-to-b from-amber-500/10 via-black to-black border-2 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] text-center relative max-w-xs w-full">
                <div className="mb-4">
                  <span className="text-[10px] font-headline tracking-[0.3em] uppercase text-amber-500 block">
                    Escanea & Únete a la Familia
                  </span>
                  <h4 className="text-lg font-headline tracking-wider text-foreground uppercase mt-0.5">
                    {shopName}
                  </h4>
                  <p className="text-[10px] text-foreground/40 font-light">Barbero Pro: {me.name}</p>
                </div>

                {/* Imagen del QR */}
                <div className="p-4 bg-white rounded-2xl shadow-inner mx-auto inline-block border-4 border-amber-500/20">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR de Afiliación" className="w-52 h-52 object-contain" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-xs text-black/50">
                      Generando QR...
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <span className="text-[9px] text-foreground/50 tracking-wider font-mono uppercase block">
                    Válido para clientes nuevos y recurrentes
                  </span>
                </div>
              </div>
            </div>

            {/* Configuración y Acciones del QR */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <h4 className="text-base font-headline tracking-wider text-foreground uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  ¿Cómo funciona este Código QR?
                </h4>
                <p className="text-xs text-foreground/70 font-light leading-relaxed">
                  Cuando un cliente visita tu barbería y escanea este código desde la cámara de su teléfono, queda automáticamente registrado y vinculado a <strong className="text-foreground">{shopName}</strong>. Podrá agendar citas directamente con tus barberos, recibir promociones especiales y acumular visitas de fidelización.
                </p>
              </div>

              {/* Enlace de Alianza */}
              <div className="space-y-2">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">
                  Enlace Directo de Afiliación
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={affiliateUrl}
                    className="bg-foreground/5 border-border rounded-xl h-12 text-xs font-mono text-amber-300/90 shadow-inner"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    variant="outline"
                    className="h-12 px-4 rounded-xl border-border flex items-center gap-2 text-xs uppercase font-headline tracking-wider shrink-0"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                  </Button>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <PremiumButton
                  onClick={handleDownloadQr}
                  className="h-12 flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-headline"
                >
                  <Download className="w-4 h-4" />
                  Descargar QR (Para Imprimir)
                </PremiumButton>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQrScanModal(true)}
                  className="h-12 rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-2 text-xs uppercase font-headline tracking-widest"
                >
                  <QrCode className="w-4 h-4" />
                  Probar Escaneo / Vista Cliente
                </Button>
              </div>

              {/* Beneficios de la Alianza */}
              <div className="p-4 rounded-2xl bg-foreground/5 border border-border/70 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] uppercase font-headline text-amber-500 block">Fidelización</span>
                  <span className="text-xs font-light text-foreground/80 mt-0.5 block">Cliente Frecuente</span>
                </div>
                <div className="border-x border-border">
                  <span className="text-[10px] uppercase font-headline text-emerald-400 block">Beneficio</span>
                  <span className="text-xs font-light text-foreground/80 mt-0.5 block">10% Off Primera Cita</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-headline text-blue-400 block">Sincronización</span>
                  <span className="text-xs font-light text-foreground/80 mt-0.5 block">Agenda Automática</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mi Plan Actual ── */}
        <div className="relative z-10 rounded-[32px] bg-card border border-border p-8 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700 group-hover:opacity-10">
            <Crown className="w-48 h-48 text-amber-500" />
          </div>
          
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-headline tracking-widest text-foreground uppercase">Mi Plan Actual</h3>
              <p className="text-[11px] text-foreground/40 font-light tracking-wide mt-0.5">Suscripción activa con MIVRABA</p>
            </div>
          </div>

          <div className="relative z-10 p-8 md:p-10 rounded-[24px] bg-gradient-to-r from-amber-500/5 to-orange-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.05)] mt-4">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/15 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 w-full md:w-auto">
              <div className="text-[10px] font-headline tracking-[0.25em] uppercase bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">
                Plan Contratado
              </div>
              <div className="flex items-center gap-3">
                <h4 className="text-3xl md:text-4xl font-headline tracking-widest text-foreground">Pro</h4>
                <div className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-[9px] font-headline tracking-widest uppercase text-amber-400">
                  Activo
                </div>
              </div>
              
              <ul className="space-y-2 mt-5">
                <li className="flex items-center gap-3 text-foreground/70 text-sm font-light">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-500" strokeWidth={3} />
                  </div>
                  25 fotos en galería
                </li>
                <li className="flex items-center gap-3 text-foreground/70 text-sm font-light">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-500" strokeWidth={3} />
                  </div>
                  Prioridad en búsquedas
                </li>
                <li className="flex items-center gap-3 text-foreground/70 text-sm font-light">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-500" strokeWidth={3} />
                  </div>
                  Calidad HD en portafolio
                </li>
              </ul>
            </div>

            <div className="relative z-10 w-full md:w-auto flex flex-col items-start md:items-end gap-3 pt-8 md:pt-0 border-t md:border-t-0 md:border-l border-border md:pl-10">
              <div className="text-left md:text-right w-full">
                <div className="flex items-baseline md:justify-end gap-1">
                  <span className="text-4xl md:text-5xl font-headline text-foreground">$4.99</span>
                  <span className="text-foreground/40 text-sm font-light">/mes</span>
                </div>
                <div className="text-[10px] text-foreground/40 font-headline tracking-widest uppercase mt-2">Próxima renovación: 15 Ago 2026</div>
              </div>
              <button onClick={() => setShowUpgrade(true)} className="w-full md:w-auto mt-4 py-3 px-8 rounded-2xl bg-foreground/5 border border-amber-500/30 text-amber-500 text-[11px] font-headline tracking-widest uppercase hover:bg-amber-500/10 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 shadow-inner">
                <Crown className="w-4 h-4" />
                Mejorar Plan
              </button>
            </div>
          </div>
        </div>

        {/* ── Galería de Cortes ── */}
        <div className="relative z-10 rounded-[32px] bg-card border border-border p-8 shadow-2xl overflow-hidden group">
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-amber-500/8 blur-[80px] rounded-full pointer-events-none" />

          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Images className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-headline tracking-widest text-foreground uppercase">Galería de Cortes</h3>
                <p className="text-[11px] text-foreground/40 font-light tracking-wide mt-0.5">Muestra tu trabajo al mundo</p>
              </div>
            </div>

            {/* Counter + button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${isFull ? 'bg-amber-500/10 border-amber-500/30' : 'bg-foreground/5 border-border'}`}>
                <div className="flex gap-0.5">
                  {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-3 rounded-full transition-all duration-300 ${
                        i < photos.length ? 'bg-amber-500' : 'bg-foreground/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-headline tracking-widest text-foreground/60 ml-1">
                  <span className={isFull ? 'text-amber-400' : 'text-foreground'}>{photos.length}</span>
                  /{MAX_PHOTOS}
                </span>
              </div>

              {/* Always show the add button — if full it triggers the modal */}
              <button
                onClick={tryOpen}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-headline tracking-widest uppercase transition-all ${
                  isFull
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                }`}
              >
                {isFull ? <Crown className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFull ? 'Más fotos' : 'Agregar foto'}</span>
              </button>
            </div>
          </div>

          {/* Hidden input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Drop zone */}
          {!isFull && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => photos.length === 0 && tryOpen()}
              className={`relative z-10 w-full rounded-[20px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center cursor-pointer mb-6
                ${photos.length === 0 ? 'min-h-[200px] p-10' : 'min-h-[80px] p-5'}
                ${isDragging
                  ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                  : 'border-border hover:border-amber-500/40 hover:bg-foreground/5'
                }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`${photos.length === 0 ? 'w-16 h-16' : 'w-10 h-10'} rounded-2xl bg-foreground/5 border border-border flex items-center justify-center`}>
                  <Upload className={`${photos.length === 0 ? 'w-7 h-7' : 'w-5 h-5'} text-foreground/30`} />
                </div>
                {photos.length === 0 ? (
                  <div>
                    <p className="text-foreground/60 font-headline tracking-widest uppercase text-sm">
                      Arrastra tus fotos aquí
                    </p>
                    <p className="text-foreground/30 font-light text-xs mt-1 tracking-wide">
                      o haz clic para seleccionar imágenes · Máx. {MAX_PHOTOS} fotos
                    </p>
                  </div>
                ) : (
                  <span className="text-xs font-light tracking-wide text-foreground/40">
                    Arrastra más fotos o{' '}
                    <span
                      className="text-amber-400 underline underline-offset-2 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); tryOpen(); }}
                    >
                      selecciona
                    </span>
                    {' '}· Quedan {MAX_PHOTOS - photos.length} espacio{MAX_PHOTOS - photos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Full drop zone — now triggers upgrade modal on drop */}
          {isFull && (
            <div
              onDrop={(e) => { e.preventDefault(); setShowUpgrade(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative z-10 w-full rounded-[20px] border-2 border-dashed transition-all duration-300 flex items-center justify-center gap-4 text-center cursor-pointer mb-6 min-h-[80px] p-5
                ${isDragging ? 'border-amber-500 bg-amber-500/10 scale-[1.01]' : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5'}`}
              onClick={() => setShowUpgrade(true)}
            >
              <Crown className="w-5 h-5 text-amber-500/60" />
              <span className="text-xs font-headline tracking-widest uppercase text-amber-500/60">
                Límite alcanzado · Arrastra aquí para ver planes de upgrade
              </span>
            </div>
          )}

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              <AnimatePresence>
                {photos.map((photo, index) => (
                  <motion.div
                    layout
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25, delay: index * 0.03, layout: { type: "spring", stiffness: 300, damping: 30 } }}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDragEnd={handleImageDragEnd}
                    className={`group relative aspect-square rounded-[16px] overflow-hidden border border-border hover:border-amber-500/30 transition-all duration-300 shadow-lg cursor-grab active:cursor-grabbing ${draggedIdx === index ? 'opacity-50 scale-95 z-50' : 'opacity-100 z-10'}`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm border border-border rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-red-500/80 hover:border-red-400/50 transition-all duration-200 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-[9px] font-headline tracking-widest text-foreground/80">#{index + 1}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {photos.length === 0 && (
            <div className="relative z-10 flex flex-col items-center justify-center py-6 text-foreground/20">
              <Images className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-headline tracking-widest uppercase">Tu galería estará aquí</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
