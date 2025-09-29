import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { dummyTestimonials } from "@/app/dashboard/data";

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary">Lo que dicen los clientes</h2>
        </div>
        <div className="flex justify-center">
            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
            >
                <CarouselContent>
                    {dummyTestimonials.map((testimonial) => (
                    <CarouselItem key={testimonial.id}>
                        <div className="p-1">
                            <Card className="border-accent bg-card p-8 h-full">
                                <CardContent className="p-0 text-center flex flex-col items-center justify-center">
                                    {testimonial.avatarUrl && (
                                        <Image
                                            src={testimonial.avatarUrl}
                                            alt={testimonial.customerName}
                                            width={80}
                                            height={80}
                                            className="rounded-full mb-6"
                                        />
                                    )}
                                    <blockquote className="text-lg italic text-foreground mb-6">
                                        “{testimonial.comment}”
                                    </blockquote>
                                    <cite className="font-bold not-italic text-primary">{testimonial.customerName}</cite>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex"/>
                <CarouselNext className="hidden sm:flex"/>
            </Carousel>
        </div>
      </div>
    </section>
  );
}
