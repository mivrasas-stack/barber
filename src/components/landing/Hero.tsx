import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Link from "next/link";

export default function Hero() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-barber');

  return (
    <section id="home" className="relative h-screen w-full">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white">
        <p className="mb-4 text-sm font-medium tracking-widest text-primary">ESTD 2007</p>
        <h1 className="text-5xl font-extrabold leading-tight md:text-7xl lg:text-8xl">
          CONOCEMOS TU <br /> MEJOR ESTILO
        </h1>
        <Button asChild variant="outline" size="lg" className="mt-8 border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-6 rounded-none">
          <Link href="/login">Pedir una Cita</Link>
        </Button>
      </div>
    </section>
  );
}
