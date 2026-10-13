"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { dummyProducts } from "@/app/clientes/data";
import { PremiumButton } from "@/components/ui/premium-button";
import Link from "next/link";
import { Star } from "lucide-react";

export default function Products() {
  // Upsell Strategy: Highlight the first product as the 'Star' product
  const starProduct = dummyProducts[0];
  const otherProducts = dummyProducts.slice(1);

  return (
    <section id="products" className="py-24 lg:py-40 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-10 bg-primary rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-20 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary font-medium tracking-[0.3em] uppercase text-xs mb-6 flex items-center justify-center gap-2">
              <Star className="w-4 h-4 fill-primary" />
              Selección Exclusiva
              <Star className="w-4 h-4 fill-primary" />
            </p>
            <h2 className="text-5xl lg:text-7xl font-bold font-headline text-foreground uppercase tracking-wider mb-6">
              Kit <span className="text-primary italic font-light">Esencial</span>
            </h2>
            <div className="w-16 h-[1px] bg-primary/50 mx-auto"></div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* STAR PRODUCT - UPSELL (Takes up 7 cols on large screens) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="lg:col-span-7 group relative flex flex-col justify-end min-h-[500px] lg:min-h-[600px] rounded-lg overflow-hidden border border-primary/30 shadow-[0_0_40px_rgba(200,155,60,0.15)] bg-background"
          >
            {/* Upsell Badge */}
            <div className="absolute top-6 left-6 z-30 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase py-2 px-4 rounded-full flex items-center gap-2 shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              El Más Recomendado
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-10"></div>
            
            <div className="absolute inset-0 w-full h-full transform transition-transform duration-1000 group-hover:scale-105">
              <Image
                src={starProduct.imageUrl}
                alt={starProduct.name}
                fill
                className="object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
              />
            </div>
            
            <div className="relative z-20 p-8 lg:p-12 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-3xl lg:text-4xl font-headline text-foreground tracking-wide uppercase mb-3 drop-shadow-md">
                  {starProduct.name}
                </h3>
                <p className="text-foreground/80 text-sm md:text-base font-light leading-relaxed max-w-md">
                  Nuestra fórmula maestra, diseñada para quienes exigen lo mejor. Obtén resultados profesionales desde casa.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-3xl font-light text-primary">
                    ${starProduct.price.toLocaleString("es-CO")}
                  </span>
                  <span className="text-sm text-foreground/50 line-through">
                    ${(starProduct.price * 1.3).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
              
              <PremiumButton asChild variant="default" className="w-full md:w-auto px-10 h-14 tracking-widest shadow-[0_0_20px_rgba(200,155,60,0.3)]">
                <Link href="/portal">Lo Quiero</Link>
              </PremiumButton>
            </div>
          </motion.div>

          {/* OTHER PRODUCTS (Takes up 5 cols on large screens) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {otherProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.2, duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="group flex flex-col sm:flex-row bg-background rounded-lg border border-border overflow-hidden flex-1 hover:border-border transition-colors duration-500"
              >
                <div className="relative w-full sm:w-2/5 aspect-[4/3] sm:aspect-auto sm:h-full bg-foreground/5">
                  <div className="absolute inset-0 w-full h-full transform transition-transform duration-700 group-hover:scale-105">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  </div>
                </div>
                
                <div className="p-6 sm:w-3/5 flex flex-col justify-center">
                  <h3 className="text-xl font-headline text-foreground tracking-wide uppercase mb-2">
                    {product.name}
                  </h3>
                  <span className="text-lg font-light text-primary mb-4 block">
                    ${product.price.toLocaleString("es-CO")}
                  </span>
                  
                  <Link href="/portal" className="text-xs uppercase tracking-widest text-foreground/60 hover:text-primary transition-colors flex items-center gap-2 mt-auto">
                    Añadir
                    <span className="w-4 h-[1px] bg-current"></span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
