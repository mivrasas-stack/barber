"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { dummyTestimonials } from "@/app/dashboard/data";

export default function Testimonials() {
  return (
    <section className="py-24 lg:py-40 bg-background relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <p className="text-primary font-medium tracking-[0.2em] uppercase text-sm mb-4">
            Reputación
          </p>
          <h2 className="text-5xl lg:text-7xl font-bold font-headline text-foreground">
            LA VOZ DEL EXITO
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {dummyTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, duration: 0.8 }}
              className="bg-card p-10 lg:p-14 relative flex flex-col h-full border border-border hover:border-primary/30 transition-colors duration-500 shadow-sm"
            >
              {/* Rating */}
              <div className="flex gap-1 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <blockquote className="text-xl lg:text-2xl leading-relaxed text-foreground/90 font-light mb-12 flex-grow">
                “{testimonial.comment}”
              </blockquote>

              <div className="flex items-center gap-6 mt-auto">
                {testimonial.avatarUrl && (
                  <Image
                    src={testimonial.avatarUrl}
                    alt={testimonial.customerName}
                    width={60}
                    height={60}
                    className="rounded-full grayscale border border-border"
                  />
                )}
                <div>
                  <cite className="block font-headline text-xl text-foreground not-italic tracking-wide">
                    {testimonial.customerName}
                  </cite>
                  <span className="text-sm text-primary tracking-widest uppercase">Cliente Exclusivo</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
