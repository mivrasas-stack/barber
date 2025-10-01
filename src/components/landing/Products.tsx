import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyProducts } from "@/app/dashboard/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Products() {
  return (
    <section id="products" className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">
            Nuestros Productos
          </h2>
          <p className="text-muted-foreground mt-2">
            Productos de alta calidad para tu cuidado personal.
          </p>
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
                {dummyProducts.map((product) => (
                  <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                      <Card className="overflow-hidden border-accent flex flex-col h-full">
                        <CardHeader>
                          <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                          <Image
                            alt={product.name}
                            className="aspect-square object-cover w-full"
                            height="300"
                            src={product.imageUrl}
                            width="300"
                          />
                        </CardContent>
                        <CardFooter className="flex justify-between items-center p-4">
                          <p className="text-lg font-bold text-primary">
                            COP {product.price.toLocaleString("es-CO")}
                          </p>
                          <Button variant="outline" asChild>
                            <Link href="/profile">Comprar</Link>
                          </Button>
                        </CardFooter>
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
