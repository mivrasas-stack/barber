import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12.52.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.76v4.03c-1.44-.05-2.89-.35-4.2-1.07A10.1 10.1 0 0 1 16.21 8.9c.01-.2.02-.4.02-.6.01-2.03-.53-4.02-1.66-5.63-1.12-1.64-2.8-2.6-4.6-2.62-.03 3.97.01 7.94.01 11.92-1.28.02-2.55.02-3.83.02s-2.55 0-3.83-.02c.01-3.97.03-7.93.01-11.91z" />
    </svg>
)


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
              <Link href="https://www.tiktok.com/@barberparadise_studio?_t=ZS-908jbH39b3y&_r=1" className="text-muted-foreground hover:text-primary"><TikTokIcon /></Link>
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
