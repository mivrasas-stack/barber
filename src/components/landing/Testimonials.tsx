import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";

export default function Testimonials() {
  const avatar = PlaceHolderImages.find(p => p.id === 'testimonial-avatar');

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Lo que dicen los clientes</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          <Card className="border-accent bg-card p-8">
            <CardContent className="p-0 text-center">
              <blockquote className="text-xl italic text-foreground mb-6">
                “Tus trabajos son realmente buenos. Confío en tus habilidades y espero que el próximo proyecto sea aún mejor que el anterior.”
              </blockquote>
              <div className="flex items-center justify-center">
                {avatar && (
                  <Image
                    src={avatar.imageUrl}
                    alt={avatar.description}
                    width={50}
                    height={50}
                    className="rounded-full mr-4"
                    data-ai-hint={avatar.imageHint}
                  />
                )}
                <cite className="font-bold not-italic text-primary">Thomas Jackson</cite>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
