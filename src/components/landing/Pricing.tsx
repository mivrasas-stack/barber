import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const services = [
  { name: "Corte de pelo", price: 40 },
  { name: "Afeitado", price: 35 },
  { name: "Corte de pelo + Afeitado", price: 70 },
  { name: "Corte de barba", price: 15 },
];

export default function Pricing() {
  return (
    <section id="services" className="py-20 lg:py-32 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Nuestros Precios</h2>
          <p className="text-muted-foreground mt-2">Servicios de calidad a precios competitivos.</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <Card className="border-accent">
            <CardContent className="p-6">
              <ul className="divide-y divide-accent">
                {services.map((service) => (
                  <li key={service.name} className="flex justify-between items-center py-4">
                    <span className="text-lg font-medium">{service.name}</span>
                    <span className="text-lg font-bold text-primary">${service.price}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
