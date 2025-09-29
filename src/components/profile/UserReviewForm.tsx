
"use client"
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from '@/lib/utils';

export function UserReviewForm() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (rating === 0) {
        toast({
            title: "Error",
            description: "Por favor, selecciona una calificación de estrellas.",
            variant: "destructive",
        });
        return;
    }
    toast({
        title: "Reseña Enviada",
        description: "¡Gracias por tus comentarios!",
    });
    setRating(0);
    setReview("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deja tu Opinión</CardTitle>
        <CardDescription>Nos encantaría conocer tu experiencia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-8 w-8 cursor-pointer transition-colors",
                (hoverRating >= star || rating >= star)
                  ? "text-primary fill-primary"
                  : "text-muted-foreground"
              )}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            />
          ))}
        </div>
        <Textarea
          placeholder="Escribe tu reseña aquí..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />
        <Button onClick={handleSubmit} className="w-full">Enviar Reseña</Button>
      </CardContent>
    </Card>
  )
}
