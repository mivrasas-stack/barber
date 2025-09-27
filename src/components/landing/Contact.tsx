import { Clock, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const contactDetails = [
  {
    icon: MapPin,
    title: "Address",
    lines: ["123 Wilkinson St, Upper West Side", "Manhattan, New York, NY 05010"],
  },
  {
    icon: Phone,
    title: "Phone",
    lines: ["1.800.218.20.20"],
  },
  {
    icon: Clock,
    title: "Opening Hours",
    lines: ["Monday–Saturday: 9am–8pm", "Sunday: 9am–6pm"],
  },
];

export default function Contact() {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {contactDetails.map((detail, index) => (
            <Card key={index} className="bg-transparent border-0 md:border-x border-accent first:border-l-0 last:border-r-0 rounded-none shadow-none">
              <CardHeader className="items-center">
                <detail.icon className="w-10 h-10 text-primary mb-4" />
                <CardTitle className="text-2xl">{detail.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {detail.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
