import Link from "next/link";
import { Instagram, Facebook, Twitter, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-background pt-24 pb-12 border-t border-border relative overflow-hidden">
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-24 mb-20">
          {/* Brand */}
          <div className="flex flex-col space-y-6">
            <Link href="/" className="text-3xl font-bold font-headline tracking-widest text-foreground">
              BARBER PARADISE
            </Link>
            <p className="text-muted-foreground font-light max-w-sm leading-relaxed">
              El arte de la barbería clásica elevada a una experiencia de lujo contemporánea. Redefiniendo el cuidado masculino desde 2007.
            </p>
            <div className="flex space-x-6 pt-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col space-y-6">
            <h4 className="text-lg font-headline text-foreground tracking-widest uppercase">Explorar</h4>
            <nav className="flex flex-col space-y-4">
              <Link href="#about" className="text-muted-foreground hover:text-foreground transition-colors">Manifiesto</Link>
              <Link href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Servicios</Link>
              <Link href="#portfolio" className="text-muted-foreground hover:text-foreground transition-colors">Galería</Link>
              <Link href="#products" className="text-muted-foreground hover:text-foreground transition-colors">Boutique</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col space-y-6">
            <h4 className="text-lg font-headline text-foreground tracking-widest uppercase">Contacto</h4>
            <div className="space-y-4">
              <p className="text-muted-foreground flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span>123 Luxury Ave, NY 10001</span>
              </p>
              <p className="text-muted-foreground flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span>+1 (555) 123-4567</span>
              </p>
              <p className="text-muted-foreground flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span>concierge@barberparadise.com</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} BarberParadise. Todos los derechos reservados.
          </p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
