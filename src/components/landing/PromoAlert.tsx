"use client";

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Star, Scissors, Gem } from 'lucide-react';
import Link from 'next/link';

export function PromoAlert() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Avoid showing the alert if the user has already seen it in this session
      if (!sessionStorage.getItem('promoAlertShown')) {
        setIsOpen(true);
        sessionStorage.setItem('promoAlertShown', 'true');
      }
    }, 3000); // Open after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="bg-card border-primary/50 text-foreground max-w-lg">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4 gap-4 text-primary animate-pulse">
            <Star className="h-10 w-10" />
            <Scissors className="h-10 w-10" />
            <Gem className="h-10 w-10" />
          </div>
          <AlertDialogTitle className="text-3xl text-center text-primary font-bold">
            ¡UNA EXPERIENCIA EXCLUSIVA TE ESPERA!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base text-muted-foreground py-4">
            ¿Listo para ser consentido? Inicia sesión y desbloquea un mundo de beneficios. Acumula puntos con cada visita, canjéalos por recompensas y disfruta de un trato VIP.
            <br/><br/>
            <strong className="text-foreground">¡Consigue un <span className="text-primary">CORTE DE PELO GRATIS</span> al llegar a 350 puntos!</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Quizás Más Tarde</Button>
            <AlertDialogAction asChild>
                <Link href="/login">Iniciar Sesión y Ganar</Link>
            </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
