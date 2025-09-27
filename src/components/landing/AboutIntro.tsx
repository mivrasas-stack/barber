import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutIntro() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary">
              Servicio Más Allá de las Expectativas
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              En BarberParadise, creemos que un corte de pelo es más que una simple tarea rutinaria: es un oficio, una forma de arte y una declaración de estilo personal. Fundada en 2007, nos hemos dedicado a brindar una experiencia de aseo premium para el hombre moderno. Nuestros barberos son maestros en su oficio, combinando técnicas tradicionales con un estilo contemporáneo para ofrecer resultados inigualables.
            </p>
            <Button asChild variant="link" className="text-primary p-0 h-auto">
              <Link href="#">Leer más sobre nosotros &rarr;</Link>
            </Button>
          </div>
          <div className="hidden md:block">
            {/* Can be an image or some graphic element */}
            <div className="w-full h-80 bg-accent rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Experiencia Premium</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
