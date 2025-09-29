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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {dummyProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden border-accent flex flex-col">
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
          ))}
        </div>
      </div>
    </section>
  );
}
