"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { dummyTestimonials } from "@/app/clientes/data";

export default function Testimonials() {
  return (
    <section className="py-32 lg:py-48 bg-background relative overflow-hidden">
      {/* Refined Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none opacity-60" />

      <div className="container mx-auto px-6 md:px-12 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <p className="text-primary font-medium tracking-[0.2em] uppercase text-xs mb-6 flex items-center gap-4">
              <span className="w-8 h-[1px] bg-primary"></span>
              Reputación
            </p>
            <h2 className="text-4xl lg:text-6xl font-medium font-headline text-foreground leading-tight tracking-tight">
              La confianza de <br />
              <span className="text-muted-foreground">quienes nos eligen.</span>
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dummyTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: index * 0.1, duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="group relative flex flex-col h-full rounded-2xl bg-gradient-to-b from-card/50 to-background border border-border/50 p-8 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              {/* Quote Icon */}
              <div className="absolute top-8 right-8 text-primary/10 transition-colors duration-500 group-hover:text-primary/20">
                <Quote className="w-12 h-12 rotate-180" strokeWidth={1} />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-4 h-4 text-primary drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Comment */}
              <blockquote className="text-lg leading-relaxed text-foreground/80 font-light mb-10 flex-grow relative z-10">
                "{testimonial.comment}"
              </blockquote>

              {/* Footer */}
              <div className="flex items-center gap-4 mt-auto pt-6 border-t border-border/40">
                {testimonial.avatarUrl ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border/80 group-hover:border-primary/40 transition-colors duration-500">
                    <Image
                      src={testimonial.avatarUrl}
                      alt={testimonial.customerName}
                      fill
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium border border-primary/20">
                    {testimonial.customerName.charAt(0)}
                  </div>
                )}
                <div>
                  <cite className="block font-medium text-base text-foreground not-italic">
                    {testimonial.customerName}
                  </cite>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Cliente Exclusivo</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
