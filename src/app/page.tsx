import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import AboutIntro from '@/components/landing/AboutIntro';
import Contact from '@/components/landing/Contact'; // CTA
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <Hero />
        <AboutIntro />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
