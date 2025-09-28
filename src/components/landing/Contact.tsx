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
        <div className="grid grid-cols-1 md:grid-cols-3 items-stretch">
          <Card className="bg-transparent border-0 rounded-none shadow-none">
            <CardContent className="p-0 h-96 md:h-full rounded-lg overflow-hidden md:rounded-r-none">
              <iframe
                src="https://maps.google.com/maps?q=Barber%20Paradise%20Studio%2C%20Cra.%2012%20%2318%2036%2C%20Funza%2C%20Cundinamarca&t=&z=17&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </CardContent>
          </Card>
          {contactDetails.map((detail, index) => (
            <Card key={index} className="bg-transparent border-0 md:border-l border-accent rounded-none shadow-none text-center flex flex-col justify-center py-8 md:py-0">
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
    </section>
  );
}
