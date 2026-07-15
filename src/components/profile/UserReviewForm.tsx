"use client"
import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea"
import { Star, MessageSquarePlus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from '@/lib/utils';
import { PremiumButton } from "@/components/ui/premium-button"
import { motion, AnimatePresence } from "framer-motion"

export function UserReviewForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (rating === 0) {
        toast({
            title: "Requerido",
            description: "Por favor, selecciona una calificación de estrellas.",
            variant: "destructive",
        });
        return;
    }
    toast({
        title: "Testimonio Recibido",
        description: "Agradecemos tu tiempo y confianza en BarberParadise.",
    });
    setRating(0);
    setReview("");
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-4 w-[calc(100vw-3rem)] sm:w-[400px] overflow-hidden rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          >
            <div className="relative bg-gradient-to-br from-white/5 to-transparent p-6">
              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <h3 className="text-xl font-headline text-white tracking-widest uppercase mb-1 mt-2">Evalúa tu Experiencia</h3>
                <p className="text-muted-foreground font-light text-xs">Ayúdanos a alcanzar la perfección.</p>
              </div>

              <div className="space-y-6">
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-8 w-8 cursor-pointer transition-all duration-300 hover:scale-110",
                        (hoverRating >= star || rating >= star)
                          ? "text-primary fill-primary drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]"
                          : "text-white/20 hover:text-white/40"
                      )}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    />
                  ))}
                </div>
                
                <Textarea
                  placeholder="Comparte los detalles de tu experiencia..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="min-h-[100px] bg-white/5 border-white/10 rounded-lg focus-visible:ring-1 focus-visible:ring-primary text-white resize-none font-light placeholder:text-white/20 text-sm"
                />
                
                <div className="pt-2">
                    <PremiumButton onClick={handleSubmit} className="w-full justify-center">
                        Enviar Testimonio
                    </PremiumButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all duration-300 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
        {isOpen ? <X className="h-6 w-6 relative z-10" /> : <MessageSquarePlus className="h-6 w-6 relative z-10" />}
      </motion.button>
    </div>
  )
}
