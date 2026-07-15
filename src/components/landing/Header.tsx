"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PremiumButton } from "@/components/ui/premium-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#home", label: "Inicio" },
  { href: "#about", label: "Manifiesto" },
  { href: "#ranking", label: "Top Barberías" },
  { href: "#pricing", label: "Planes" },
  { href: "#portfolio", label: "Galería" },
  { href: "#products", label: "Boutique" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-500",
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border py-4" : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="text-3xl font-bold font-headline tracking-widest text-foreground hover:text-primary transition-colors">
          BARBER PARADISE
        </Link>

        <nav className="hidden md:flex items-center space-x-10 text-sm font-medium tracking-widest uppercase">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-2 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          <PremiumButton asChild variant="outline" size="sm" className="hidden lg:flex">
             <Link href="/login">Iniciar Sesión</Link>
          </PremiumButton>
          <PremiumButton asChild size="sm">
             <Link href="/login">Reservar</Link>
          </PremiumButton>
        </div>

        <div className="md:hidden flex items-center space-x-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-foreground/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm bg-background/95 backdrop-blur-xl border-l border-border p-0">
              <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
              <SheetDescription className="sr-only">Enlaces de navegación de la página</SheetDescription>
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-12">
                  <Link href="/" className="text-2xl font-bold font-headline tracking-widest text-foreground" onClick={() => setIsOpen(false)}>
                      BARBER PARADISE
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-foreground hover:bg-foreground/10">
                      <X className="h-6 w-6" />
                  </Button>
                </div>
                <nav className="flex flex-col space-y-8">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link
                        href={link.href}
                        className="text-2xl font-headline tracking-wider text-foreground hover:text-primary transition-colors block"
                        onClick={() => setIsOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
                <div className="mt-auto space-y-4">
                  <PremiumButton asChild variant="outline" className="w-full justify-center" onClick={() => setIsOpen(false)}>
                      <Link href="/login">Iniciar Sesión</Link>
                  </PremiumButton>
                  <PremiumButton asChild className="w-full justify-center" onClick={() => setIsOpen(false)}>
                      <Link href="/login">Reservar Cita</Link>
                  </PremiumButton>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
