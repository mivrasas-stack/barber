
"use client"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { dummyProducts } from "@/app/dashboard/data"
import { useToast } from "@/hooks/use-toast"

export function UserProducts() {
  const { toast } = useToast()

  const handleAddToCart = (productName: string) => {
    toast({
      title: "Producto Añadido",
      description: `${productName} ha sido añadido a tu carrito.`,
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
        <CardDescription>Compra tus productos de cuidado personal favoritos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dummyProducts.map(product => (
                <Card key={product.id} className="overflow-hidden flex flex-col">
                    <CardHeader className="p-2">
                        <CardTitle className="text-base truncate">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow">
                        <Image
                        alt={product.name}
                        className="aspect-square object-cover w-full"
                        height="200"
                        src={product.imageUrl}
                        width="200"
                        />
                    </CardContent>
                    <CardFooter className="flex flex-col items-start p-2">
                        <p className="text-sm font-bold text-primary">
                        COP {product.price.toLocaleString("es-CO")}
                        </p>
                        <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => handleAddToCart(product.name)}>
                            Añadir al carrito
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
