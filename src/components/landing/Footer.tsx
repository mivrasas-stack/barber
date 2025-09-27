import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-accent py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-bold font-headline tracking-wider text-primary mb-4">
              Nelson Barber
            </h3>
            <p className="text-muted-foreground text-sm">
              Crafting style since 2007. The finest grooming experience for the modern gentleman.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="#home" className="hover:text-primary">Home</Link></li>
              <li><Link href="#services" className="hover:text-primary">Services</Link></li>
              <li><Link href="#about" className="hover:text-primary">About Us</Link></li>
              <li><Link href="/login" className="hover:text-primary">Dashboard Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-4">Follow Us</h4>
            <div className="flex justify-center md:justify-start space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary"><Facebook /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Instagram /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Twitter /></Link>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-accent text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Nelson Barber. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
