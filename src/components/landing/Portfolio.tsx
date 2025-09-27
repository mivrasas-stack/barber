import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";

export default function Portfolio() {
  const portfolioBeard = PlaceHolderImages.find(p => p.id === 'portfolio-beard');
  const portfolioHaircut = PlaceHolderImages.find(p => p.id === 'portfolio-haircut');

  return (
    <section id="portfolio" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Descubre Nuestros Trabajos</h2>
          <p className="text-muted-foreground mt-2">Un vistazo a nuestro oficio y pasión.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {portfolioBeard && (
            <Card className="overflow-hidden border-accent">
              <CardContent className="p-0">
                <Image
                  src={portfolioBeard.imageUrl}
                  alt={portfolioBeard.description}
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover aspect-[4/3]"
                  data-ai-hint={portfolioBeard.imageHint}
                />
              </CardContent>
            </Card>
          )}
          {portfolioHaircut && (
            <Card className="overflow-hidden border-accent">
              <CardContent className="p-0">
                <Image
                  src={portfolioHaircut.imageUrl}
                  alt={portfolioHaircut.description}
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover aspect-[4/3]"
                  data-ai-hint={portfolioHaircut.imageHint}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
