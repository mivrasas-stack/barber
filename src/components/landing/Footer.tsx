import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-accent py-12">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-bold font-headline tracking-wider text-primary mb-4">
              BarberParadise
            </h3>
            <p className="text-muted-foreground text-sm">
              Creando estilo desde 2007. La mejor experiencia de aseo para el caballero moderno.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="#home" className="hover:text-primary">Inicio</Link></li>
              <li><Link href="#services" className="hover:text-primary">Servicios</Link></li>
              <li><Link href="#about" className="hover:text-primary">Sobre Nosotros</Link></li>
              <li><Link href="/login" className="hover:text-primary">Acceso al Panel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Síguenos</h4>
            <div className="flex justify-center md:justify-start space-x-4">
              <Link href="/admin/candidates/35ba52a9-ddce-4829-ab75-871d67889a04" className="text-muted-foreground hover:text-primary"><Facebook /></Link>
              <Link href="https://www.instagram.com/barberparadisestudio?igsh=MWg3ZXR4cG5ybjFndA==" className="text-muted-foreground hover:text-primary"><Instagram /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Twitter /></Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-accent text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} BarberParadise. Todos los Derechos Reservados.</p>
        </div>
      </div>
    </footer>
  );
}
