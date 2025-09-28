import { Clock, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path><path d="M14.05 14.05a2 2 0 0 1-2.83 0L10 12.72a4 4 0 0 1 0-5.66l1.22-1.22a2 2 0 0 1 2.83 0z"></path></svg>
  );

const contactDetails = [
  {
    icon: WhatsAppIcon,
    title: "WhatsApp",
    content: (
        <Link href="https://wa.me/573224414646" target="_blank" rel="noopener noreferrer" className="hover:underline">
            +57 322 441 4646
        </Link>
    ),
  },
  {
    icon: Clock,
    title: "Horario de Apertura",
    content: (
        <>
            <p>Lunes a Sábado: 9am–8pm</p>
            <p>Domingo: 9am–6pm</p>
        </>
    ),
  },
];

export default function Contact() {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-card">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="h-96 md:h-full rounded-lg overflow-hidden">
            <iframe
              src="https://maps.google.com/maps?q=Barber%20Paradise%20Studio%2C%20Cra.%2012%20%2318%2036%2C%20Funza%2C%20Cundinamarca&t=&z=17&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            {contactDetails.map((detail, index) => (
              <Card key={index} className="bg-transparent border-0 md:border-x border-accent first:border-l-0 last:border-r-0 rounded-none shadow-none first:sm:border-l-0 sm:last:border-r-0 sm:border-r">
                <CardHeader className="items-center">
                  <detail.icon className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="text-2xl">{detail.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    {detail.content}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
