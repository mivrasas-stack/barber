"use client"
import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { dummyPortfolioItems } from "@/app/dashboard/data";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function Portfolio() {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  );

  return (
    <section id="portfolio" className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Descubre Nuestros Trabajos</h2>
          <p className="text-muted-foreground mt-2">Un vistazo a nuestro oficio y pasión.</p>
        </div>
        <div className="flex justify-center">
            <Carousel
              plugins={[plugin.current]}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
            >
              <CarouselContent>
                {dummyPortfolioItems.map((item) => (
                  <CarouselItem key={item.id} className="md:basis-1/2">
                    <div className="p-1 h-full">
                        <Card className="overflow-hidden border-accent">
                            <CardContent className="p-0">
                                <Image
                                src={item.imageUrl}
                                alt={item.description}
                                width={800}
                                height={600}
                                className="w-full h-auto object-cover aspect-[4/3]"
                                />
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
      </div>
    </section>
  );
}
