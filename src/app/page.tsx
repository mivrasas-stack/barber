import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import AboutIntro from '@/components/landing/AboutIntro';
import Contact from '@/components/landing/Contact';
import Portfolio from '@/components/landing/Portfolio';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <AboutIntro />
        <Contact />
        <Portfolio />
        <Pricing />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
