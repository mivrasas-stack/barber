import { Clock, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

const contactDetails = [
  {
    icon: () => (
        <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png" alt="WhatsApp" width={40} height={40} className="mb-4"/>
    ),
    title: "WhatsApp",
    content: (
        <Link href="https://wa.me/573224414646" target="_blank" rel="noopener noreferrer" className="hover:underline">
            +57 322 441 4646
        </Link>
    ),
  },
  {
    icon: (props: any) => <Clock {...props} />,
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
