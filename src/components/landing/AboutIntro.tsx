import Image from "next/image";

export default function AboutIntro() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary">
              Servicio Más Allá de las Expectativas
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              En BarberParadise, creemos que un corte de pelo es más que una simple tarea rutinaria: es un oficio, una forma de arte y una declaración de estilo personal. Fundada en 2007, nos hemos dedicado a brindar una experiencia de aseo premium para el hombre moderno. Nuestros barberos son maestros en su oficio, combinando técnicas tradicionales con un estilo contemporáneo para ofrecer resultados inigualables.
            </p>
          </div>
          <div className="hidden md:block">
            <Image
              src="https://images.pexels.com/photos/1570807/pexels-photo-1570807.jpeg"
              alt="Barber applying shaving cream"
              width={800}
              height={600}
              className="w-full h-auto object-cover aspect-[4/3] rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}