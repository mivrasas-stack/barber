"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PremiumButton } from "@/components/ui/premium-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
 {href:"#home",label:"Inicio"},
 {href:"#about",label:"Nuestra visión"},
 {href:"/directorio",label:"Directorio"},
 {href:"/profesionales",label:"Profesionales"},
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
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border py-4 shadow-sm"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo — white when transparent over hero, theme-aware when scrolled */}
        <Link
          href="/"
          className={cn(
            "text-3xl font-bold font-headline tracking-widest hover:text-primary transition-colors",
            scrolled ? "text-foreground" : "text-foreground"
          )}
        >
          BARBER PARADISE
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-sm font-medium tracking-wider uppercase">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "hover:text-primary transition-colors relative group whitespace-nowrap",
                scrolled ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
              )}
            >
              {link.label}
              <span className="absolute -bottom-2 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-3">
          {/* Theme toggle — always visible regardless of scroll state */}
          <ThemeToggle scrolled={scrolled} />

          <Button asChild variant="ghost" size="sm" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground whitespace-nowrap">
            <Link href="/profesionales">Soy Barbero</Link>
          </Button>

          <PremiumButton asChild size="sm" className="whitespace-nowrap">
            <Link href="/login">Reservar</Link>
          </PremiumButton>
        </div>

        {/* Mobile Actions */}
        <div className="lg:hidden flex items-center space-x-2">
          <ThemeToggle scrolled={scrolled} />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-foreground/10",
                  scrolled ? "text-foreground hover:bg-foreground/10" : "text-foreground"
                )}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm bg-background/98 backdrop-blur-xl border-l border-border p-0">
              <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
              <SheetDescription className="sr-only">Enlaces de navegación de la página</SheetDescription>
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-12">
                  <Link
                    href="/"
                    className="text-2xl font-bold font-headline tracking-widest text-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    BARBER PARADISE
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-foreground hover:bg-foreground/10"
                  >
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
                <div className="mt-auto space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-center uppercase tracking-wider text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href="/profesionales">Soy Barbero</Link>
                  </Button>
                  <PremiumButton
                    asChild
                    className="w-full justify-center"
                    onClick={() => setIsOpen(false)}
                  >
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
