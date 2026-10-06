"use client";
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface CancelAppointmentDialogProps {
  onConfirm: () => void;
}

export function CancelAppointmentDialog({ onConfirm }: CancelAppointmentDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-transparent border-border text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
        >
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Realmente deseas cancelar la cita?</AlertDialogTitle>
          <AlertDialogDescription>
            Recuerda que después de una hora de agendada la cita no podrás cancelar y tus puntos disminuirán, perderás 15 puntos por no asistir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sí, Cancelar Cita
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
