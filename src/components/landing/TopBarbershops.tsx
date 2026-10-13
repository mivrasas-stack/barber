"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Navigation, Info, Users, MessageSquare, Clock, ArrowRight, Scissors } from "lucide-react";
import Link from "next/link";
import { PremiumButton } from "@/components/ui/premium-button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { barbershops as topBarbershops } from "@/lib/data";
export default function TopBarbershops() {
  const [selectedShop, setSelectedShop] = useState<typeof topBarbershops[0] | null>(null);
  const [bookingBarber, setBookingBarber] = useState<any>(null);
  const { toast } = useToast();

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "¡Reserva Confirmada!",
      description: `Tu cita con ${bookingBarber?.name} ha sido agendada con éxito.`,
    });
    setBookingBarber(null);
  };

  return (
    <section id="ranking" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Map Placeholder Texture */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-[100%] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top Ranking Nacional
            </p>
            <h2 className="text-4xl lg:text-6xl font-bold font-headline text-foreground leading-tight uppercase tracking-widest">
              Las Preferidas por los Clientes
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg font-light max-w-sm"
          >
            Descubre las barberías mejor valoradas que ya utilizan nuestro sistema para brindar un servicio de excelencia.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {topBarbershops.map((shop, index) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="group relative bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,155,60,0.15)] flex flex-col shadow-sm cursor-pointer"
              onClick={() => setSelectedShop(shop)}
            >
              <div className="relative w-full h-64 overflow-hidden">
                <Image
                  src={shop.imageUrl}
                  alt={shop.name}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                
                {/* Ranking Badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-border px-3 py-1 rounded-full flex items-center gap-1">
                   <span className="text-primary font-headline text-sm tracking-widest">#{index + 1}</span>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow relative z-10 -mt-16 pointer-events-none">
                <div className="flex items-center gap-1 mb-2 bg-black/70 backdrop-blur-md border border-border w-max px-3 py-1 rounded-full pointer-events-auto">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-foreground font-medium text-sm">{shop.rating}</span>
                  <span className="text-foreground/60 text-xs ml-1">({shop.reviews})</span>
                </div>
                
                <h3 className="text-2xl font-headline text-foreground mb-1 tracking-wide uppercase mt-4">{shop.name}</h3>
                <p className="text-primary text-sm font-medium tracking-widest uppercase mb-4">{shop.specialty}</p>
                
                <div className="flex items-center gap-2 text-muted-foreground font-light text-sm mb-8 mt-auto pointer-events-auto">
                  <MapPin className="w-4 h-4" />
                  {shop.location}
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between pointer-events-auto">
                   <PremiumButton 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={(e) => { e.stopPropagation(); setSelectedShop(shop); }}
                   >
                       <Navigation className="w-4 h-4" /> Ver Detalles
                   </PremiumButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
            <Link href="/directorio">
                <PremiumButton>Explorar Directorio Completo</PremiumButton>
            </Link>
        </div>
      </div>

      {/* Detailed Modal */}
      <Dialog open={!!selectedShop} onOpenChange={(open) => !open && setSelectedShop(null)}>
        <DialogContent className="max-w-4xl bg-background border-border text-foreground p-0 overflow-hidden rounded-2xl h-[90vh] md:h-[80vh] flex flex-col">
          {selectedShop && (
            <>
              {/* Header with Image */}
              <div className="relative h-48 md:h-64 shrink-0 w-full">
                <Image 
                  src={selectedShop.imageUrl} 
                  alt={selectedShop.name} 
                  fill 
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-headline uppercase tracking-widest">
                      {selectedShop.specialty}
                    </span>
                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md border border-border px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-foreground text-xs">{selectedShop.rating}</span>
                    </div>
                  </div>
                  <DialogTitle className="text-3xl md:text-5xl font-headline tracking-widest uppercase text-foreground mb-2">
                    {selectedShop.name}
                  </DialogTitle>
                  <p className="text-foreground/60 flex items-center gap-2 text-sm font-light">
                    <MapPin className="w-4 h-4" /> {selectedShop.location}
                  </p>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="bg-foreground/5 border border-border mb-6 p-1 rounded-xl flex w-full max-w-sm mx-auto">
                    <TabsTrigger value="info" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg text-xs font-headline uppercase tracking-widest">Info</TabsTrigger>
                    <TabsTrigger value="barbers" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg text-xs font-headline uppercase tracking-widest">Barberos</TabsTrigger>
                    <TabsTrigger value="reviews" className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-black rounded-lg text-xs font-headline uppercase tracking-widest">Opiniones</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h4 className="text-amber-500 font-headline tracking-widest uppercase text-sm mb-3">Sobre Nosotros</h4>
                      <p className="text-foreground/70 font-light leading-relaxed text-sm">
                        {selectedShop.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-amber-500 font-headline tracking-widest uppercase text-sm mb-4">Instalaciones</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedShop.gallery.map((img, i) => (
                          <div key={i} className="relative h-32 md:h-48 rounded-2xl overflow-hidden border border-border group">
                            <Image src={img} alt="Instalaciones" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="barbers" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {selectedShop.barbers.map(barber => (
                      <div key={barber.id} className="bg-foreground/5 border border-border rounded-2xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                          <Image src={barber.avatar} alt={barber.name} width={64} height={64} className="rounded-full object-cover border-2 border-amber-500/50" />
                          <div>
                            <h4 className="text-lg font-headline tracking-wide text-foreground">{barber.name}</h4>
                            <p className="text-amber-500/70 text-xs font-headline tracking-widest uppercase">{barber.role}</p>
                          </div>
                          <PremiumButton 
                             className="ml-auto px-4 py-2 text-xs h-auto hidden md:flex"
                             onClick={() => setBookingBarber(barber)}
                          >
                            Reservar con {barber.name.split(' ')[0]}
                          </PremiumButton>
                        </div>
                        
                        <div>
                          <p className="text-foreground/40 text-xs font-headline uppercase tracking-widest mb-3">Portafolio Reciente</p>
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {barber.portfolio.map((img, i) => (
                              <div key={i} className="relative w-40 h-40 shrink-0 rounded-xl overflow-hidden border border-border group cursor-pointer">
                                <Image src={img} alt={`Trabajo de ${barber.name}`} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Scissors className="w-6 h-6 text-amber-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="reviews" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-6">
                       <div>
                         <p className="text-4xl font-headline text-foreground">{selectedShop.rating}</p>
                         <p className="text-amber-500/70 text-xs font-headline tracking-widest uppercase mt-1">De {selectedShop.reviews} opiniones</p>
                       </div>
                       <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className={`w-5 h-5 ${star <= Math.round(selectedShop.rating) ? 'text-amber-500 fill-amber-500' : 'text-foreground/20'}`} />
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                      {selectedShop.customerReviews.map(review => (
                        <div key={review.id} className="bg-foreground/5 border border-border rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-900 flex items-center justify-center text-black font-headline font-bold text-xs">
                                 {review.author.charAt(0)}
                               </div>
                               <div>
                                 <p className="text-sm font-medium text-foreground/90">{review.author}</p>
                                 <p className="text-xs text-foreground/40">{review.date}</p>
                               </div>
                            </div>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-foreground/20'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm font-light text-foreground/70 italic">&ldquo;{review.comment}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={!!bookingBarber} onOpenChange={(open) => !open && setBookingBarber(null)}>
        <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-foreground mb-2">Reservar Cita</DialogTitle>
            <DialogDescription className="text-foreground/60 text-sm font-light">
              Completa los datos para agendar tu cita con {bookingBarber?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBooking} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-headline uppercase tracking-widest text-amber-500">Servicio</label>
              <Select required>
                <SelectTrigger className="w-full bg-foreground/5 border-border rounded-xl px-4 py-6 text-sm text-foreground hover:bg-foreground/10 focus:ring-0 focus:border-amber-500/50 transition-colors">
                  <SelectValue placeholder="Selecciona un servicio..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground rounded-xl shadow-2xl shadow-black">
                  <SelectItem value="clasico" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer py-3">Corte Clásico ($40.000)</SelectItem>
                  <SelectItem value="barba" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer py-3">Diseño de Barba ($25.000)</SelectItem>
                  <SelectItem value="completo" className="focus:bg-amber-500/10 focus:text-amber-500 cursor-pointer py-3">Corte + Barba ($60.000)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-amber-500">Fecha</label>
                <input type="date" required className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500/50 [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-amber-500">Hora</label>
                <input type="time" required className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500/50 [color-scheme:dark]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-headline uppercase tracking-widest text-amber-500">Tu Nombre</label>
              <input type="text" placeholder="Ej. Juan Pérez" required className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-amber-500/50 placeholder:text-foreground/20" />
            </div>

            <PremiumButton type="submit" className="w-full mt-4 justify-center py-3">Confirmar Reserva</PremiumButton>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </section>
  );
}
