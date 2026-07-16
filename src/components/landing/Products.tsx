"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { dummyProducts } from "@/app/dashboard/data";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from "next/link";

export default function Products() {
  return (
    <section id="products" className="py-24 lg:py-40 bg-muted/50">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4">
            Boutique
          </p>
          <h2 className="text-5xl lg:text-7xl font-bold font-headline text-foreground">
            CUIDADO PREMIUM
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {dummyProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.8 }}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative w-full aspect-square mb-10 bg-card rounded-3xl overflow-hidden p-12 transition-colors duration-500 group-hover:bg-muted border border-border shadow-sm">
                <div className="relative w-full h-full transform transition-transform duration-700 group-hover:scale-110 group-hover:-translate-y-4">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain filter drop-shadow-2xl"
                  />
                </div>
              </div>
              
              <h3 className="text-2xl font-headline text-foreground mb-2">{product.name}</h3>
              <p className="text-muted-foreground text-sm font-light mb-6 line-clamp-2 max-w-xs mx-auto">
                Formulado con los ingredientes más puros para mantener tu estilo de forma impecable durante todo el día.
              </p>
              
              <div className="mt-auto flex flex-col items-center gap-6 w-full">
                <span className="text-2xl font-light text-foreground">
                  COP {product.price.toLocaleString("es-CO")}
                </span>
                
                <PremiumButton asChild variant="outline" className="w-full max-w-[200px] rounded-full group-hover:bg-foreground group-hover:text-background group-hover:border-foreground transition-all duration-300">
                  <Link href="/portal">Añadir al Carrito</Link>
                </PremiumButton>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
