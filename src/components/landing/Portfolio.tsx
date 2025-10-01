import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { dummyPortfolioItems } from "@/app/dashboard/data";

export default function Portfolio() {

  return (
    <section id="portfolio" className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Descubre Nuestros Trabajos</h2>
          <p className="text-muted-foreground mt-2">Un vistazo a nuestro oficio y pasión.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {dummyPortfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden border-accent">
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
          ))}
        </div>
      </div>
    </section>
  );
}
