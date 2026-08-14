"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { dummyPortfolioItems } from "@/app/clientes/data";

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-24 lg:py-40 bg-background">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4">
            Lookbook
          </p>
          <h2 className="text-5xl lg:text-7xl font-bold font-headline text-foreground">
            NUESTRO ARTE
          </h2>
        </div>

        {/* Grid Layout for uniform image sizes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyPortfolioItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: (index % 3) * 0.1, duration: 0.8 }}
              className="relative group overflow-hidden bg-muted aspect-[3/4] rounded-xl"
            >
              <Image
                src={item.imageUrl}
                alt={item.description || "Portfolio item"}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                <p className="text-primary font-medium text-sm tracking-widest uppercase translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                  Estilo
                </p>
                <h3 className="text-white text-2xl font-headline translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  {item.description || "Corte Clásico"}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
