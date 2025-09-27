
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "#home", label: "Inicio" },
  { href: "#services", label: "Servicios" },
  { href: "#about", label: "Sobre Nosotros" },
  { href: "#portfolio", label: "Portafolio" },
  { href: "#contact", label: "Contactos" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
      <div className=" flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-2xl font-bold font-headline tracking-wider text-primary">
          BarberParadise
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Link href="/login">Pedir Cita</Link>
            </Button>
            <Button asChild>
                <Link href="/login">Iniciar Sesión</Link>
            </Button>
        </div>
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs bg-background">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <Link href="/" className="text-xl font-bold font-headline text-primary" onClick={() => setIsOpen(false)}>
                        BarberParadise
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <nav className="flex-grow flex flex-col items-center justify-center space-y-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-lg transition-colors hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setIsOpen(false)}>
                      <Link href="/login">Pedir Cita</Link>
                  </Button>
                  <Button asChild onClick={() => setIsOpen(false)}>
                      <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
  );
}
