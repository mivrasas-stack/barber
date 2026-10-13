import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import AboutIntro from '@/components/landing/AboutIntro';
import Pricing from '@/components/landing/Pricing'; // Servicios
import Portfolio from '@/components/landing/Portfolio'; // Galería
import Products from '@/components/landing/Products';
import Testimonials from '@/components/landing/Testimonials';
import TopBarbershops from '@/components/landing/TopBarbershops';
import Contact from '@/components/landing/Contact'; // CTA
import Footer from '@/components/landing/Footer';
import { PromoAlert } from '@/components/landing/PromoAlert';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <AboutIntro />
        <TopBarbershops />
        <Pricing />
        <Portfolio />
        <Products />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
