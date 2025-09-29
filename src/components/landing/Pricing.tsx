import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";
import { dummyServices } from "@/app/dashboard/data";

export default function Pricing() {
  return (
    <section id="services" className="py-20 lg:py-32 bg-card">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Nuestros Precios</h2>
          <p className="text-muted-foreground mt-2">Servicios de calidad a precios competitivos.</p>
        </div>
        <div className="flex justify-center">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-4xl"
            >
              <CarouselContent>
                {dummyServices.map((service) => (
                  <CarouselItem key={service.id} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                      <Card className="overflow-hidden border-accent">
                        <CardContent className="flex flex-col aspect-square items-center justify-center p-0">
                          {service.imageUrl && (
                              <Image
                                src={service.imageUrl}
                                alt={service.name}
                                width={600}
                                height={400}
                                className="w-full h-48 object-cover"
                              />
                          )}
                          <div className="p-4 flex-grow flex flex-col justify-between">
                            <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                            <p className="text-xl font-bold text-primary mt-2">
                                COP {service.price.toLocaleString('es-CO')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex"/>
              <CarouselNext className="hidden sm:flex"/>
            </Carousel>
        </div>
        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <Link href="#">Ver todos los precios</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
