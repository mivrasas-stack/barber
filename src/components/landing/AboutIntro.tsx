import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutIntro() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary">
              Service Beyond Expectation
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              At Nelson Barber, we believe a haircut is more than just a routine task—it's a craft, an art form, and a statement of personal style. Established in 2007, we've dedicated ourselves to providing a premium grooming experience for the modern man. Our barbers are masters of their trade, combining traditional techniques with contemporary styling to deliver unparalleled results.
            </p>
            <Button asChild variant="link" className="text-primary p-0 h-auto">
              <Link href="#">Read more about us &rarr;</Link>
            </Button>
          </div>
          <div className="hidden md:block">
            {/* Can be an image or some graphic element */}
            <div className="w-full h-80 bg-accent rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Premium Experience</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
