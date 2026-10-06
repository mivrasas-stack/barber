"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Quote, ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import { dummyTestimonials, dummyBarbers } from "../data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const barberias = [
  {
    id: "barberia_1",
    name: "The Gentleman's Lounge",
    barbers: [
      { id: "carlos", name: "Carlos (Maestro Barbero)", avatarUrl: "https://picsum.photos/seed/carlos/100/100" },
      { id: "miguel", name: "Miguel (Especialista en Barbas)", avatarUrl: "https://picsum.photos/seed/miguel/100/100" }
    ]
  },
  {
    id: "barberia_2",
    name: "Classic Cuts Barber",
    barbers: [
      { id: "andres", name: "Andrés (Cortes Clásicos)", avatarUrl: "https://picsum.photos/seed/andres/100/100" },
      { id: "luis", name: "Luis (Fade y Diseños)", avatarUrl: "https://picsum.photos/seed/luis/100/100" }
    ]
  }
];

export default function ResenasPage() {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [selectedBarberia, setSelectedBarberia] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !selectedBarber || !reviewText.trim()) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor califica, selecciona el barbero y escribe tu opinión.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const storedReviews = JSON.parse(localStorage.getItem('barber_reviews') || '[]');
      storedReviews.push({
        id: `REV_${Date.now()}`,
        barberId: selectedBarber,
        rating,
        comment: reviewText,
        date: new Date().toLocaleDateString('es-ES'),
      });
      localStorage.setItem('barber_reviews', JSON.stringify(storedReviews));
    } catch (err) {
      console.error('Error al guardar reseña:', err);
    }

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast({
        title: "Reseña publicada",
        description: "Gracias por compartir tu experiencia con nosotros.",
        className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      });
    }, 1500);
  };

  return (
    <div className="w-full flex flex-col gap-8 font-sans pb-24 relative min-h-screen">
      {/* Ambient background */}
      <div className="fixed top-0 right-0 w-[40vw] h-[40vw] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-0 left-0 w-[50vw] h-[50vw] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <div className="flex flex-col mt-2 gap-4 relative z-10">
        <Link href="/clientes" className="inline-flex items-center text-foreground/40 hover:text-foreground transition-colors text-sm w-fit mb-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver al Inicio
        </Link>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.15)]">
            <MessageSquare className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-headline uppercase tracking-widest text-foreground/90">
              Tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">Reseñas</span>
            </h1>
            <p className="text-foreground/40 text-sm md:text-base font-light tracking-wide mt-1">
              Tu opinión nos ayuda a mantener el nivel de excelencia.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Formulario de Reseña */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-5"
        >
          <div className="bg-background border border-border p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none" />
            
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleSubmit}
                  className="space-y-6 relative z-10"
                >
                  <div>
                    <h2 className="text-xl font-headline uppercase tracking-widest text-foreground mb-2">Deja tu Opinión</h2>
                    <p className="text-sm text-foreground/40 font-light mb-6">Evalúa tu última visita al salón.</p>
                  </div>

                  {/* Rating Selector */}
                  <div className="flex flex-col items-center justify-center py-4 bg-foreground/5 rounded-2xl border border-border">
                    <p className="text-xs uppercase tracking-widest text-foreground/40 mb-3">Calificación General</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => setRating(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star 
                            className={`w-8 h-8 md:w-10 md:h-10 transition-colors duration-300 ${
                              star <= (hoveredRating || rating) 
                                ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                                : "fill-transparent text-foreground/20"
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Barberia Selector */}
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-foreground/60">¿En cuál sede te atendieron?</label>
                    <Select 
                      value={selectedBarberia} 
                      onValueChange={(val) => {
                        setSelectedBarberia(val);
                        setSelectedBarber(""); // Reset barber when location changes
                      }}
                    >
                      <SelectTrigger className="w-full h-14 bg-foreground/5 border-border text-foreground rounded-xl focus:ring-pink-500/50">
                        <SelectValue placeholder="Selecciona la barbería..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-foreground rounded-xl">
                        {barberias.map(b => (
                          <SelectItem key={b.id} value={b.id} className="focus:bg-zinc-800 rounded-lg cursor-pointer">
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Barber Selector */}
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-foreground/60">¿Quién te atendió?</label>
                    <Select value={selectedBarber} onValueChange={setSelectedBarber} disabled={!selectedBarberia}>
                      <SelectTrigger className="w-full h-14 bg-foreground/5 border-border text-foreground rounded-xl focus:ring-pink-500/50 disabled:opacity-50">
                        <SelectValue placeholder="Selecciona tu barbero..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-foreground rounded-xl">
                        {barberias.find(b => b.id === selectedBarberia)?.barbers.map(b => (
                          <SelectItem key={b.id} value={b.id} className="focus:bg-zinc-800 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-6 h-6 border border-border">
                                <AvatarImage src={b.avatarUrl} />
                                <AvatarFallback>{b.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {b.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-widest text-foreground/60">Tu experiencia</label>
                    <Textarea 
                      placeholder="Cuéntanos cómo te fue con el servicio..."
                      className="min-h-[120px] bg-foreground/5 border-border text-foreground rounded-xl resize-none focus:ring-pink-500/50 focus:border-pink-500/50 placeholder:text-foreground/20"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-foreground rounded-xl font-headline tracking-widest uppercase shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-foreground/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Publicar Reseña
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-12 relative z-10"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-headline tracking-widest uppercase text-foreground mb-2">¡Gracias!</h3>
                  <p className="text-foreground/50 font-light mb-8 max-w-xs">
                    Tu reseña ha sido publicada y ayuda a nuestra comunidad a elegir siempre lo mejor.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setRating(0);
                      setReviewText("");
                      setSelectedBarber("");
                    }}
                    className="border-border text-foreground hover:bg-foreground/5 rounded-full"
                  >
                    Escribir otra reseña
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Comunidad / Testimonios recientes */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-7 space-y-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-headline tracking-widest uppercase text-foreground/80">Comunidad</h2>
            <p className="text-xs text-foreground/30 uppercase tracking-widest">Recientes</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {dummyTestimonials.map((testimonial, i) => (
              <motion.div 
                key={testimonial.id}
                variants={itemVariants}
                className="bg-foreground/5 border border-border p-6 rounded-3xl hover:bg-foreground/[0.04] transition-colors relative"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-foreground/5 rotate-180" />
                
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-border shrink-0">
                    <AvatarImage src={testimonial.avatarUrl} className="object-cover" />
                    <AvatarFallback>{testimonial.customerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-foreground font-medium">{testimonial.customerName}</h4>
                      {/* Fake stars for the dummy data to look premium */}
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= (5 - (i%2)) ? "fill-amber-400 text-amber-400" : "fill-transparent text-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-foreground/60 font-light text-sm leading-relaxed">
                      &ldquo;{testimonial.comment}&rdquo;
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
