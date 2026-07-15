"use client"
import Image from "next/image"
import { dummyWaitingRoomProducts } from "@/app/dashboard/data"
import { useToast } from "@/hooks/use-toast"
import { useWaitRoom } from "@/hooks/use-wait-room"
import type { WaitingRoomProduct } from "@/lib/types"
import { PremiumButton } from "@/components/ui/premium-button"

export function UserWaitingRoom() {
  const { toast } = useToast()
  const { addToWaitRoom } = useWaitRoom();

  const handleOrder = (product: WaitingRoomProduct) => {
    addToWaitRoom(product);
    toast({
      title: "Cortesía Solicitada",
      description: `${product.name} se está preparando para ti.`,
    })
  }
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="pb-6 border-b border-white/10">
        <h2 className="text-3xl font-headline text-white tracking-wide">LOUNGE VIP</h2>
        <p className="text-muted-foreground font-light mt-1">Disfruta de nuestra selección de cortesía mientras esperas.</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {dummyWaitingRoomProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="group relative flex flex-col bg-transparent overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                  <div className="relative aspect-square w-full overflow-hidden bg-white/5">
                      <Image
                        alt={product.name}
                        fill
                        src={product.imageUrl}
                        className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                      />
                      {/* Dark gradient overlay at the bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                      
                      <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <PremiumButton 
                            variant="glass" 
                            size="sm" 
                            className="w-full h-10 text-xs"
                            onClick={() => handleOrder(product)}
                          >
                              Solicitar
                          </PremiumButton>
                      </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 text-center border border-white/5 border-t-0 bg-white/5 group-hover:bg-white/10 transition-colors duration-300">
                      <h3 className="text-lg font-headline text-white tracking-wide mb-1">{product.name}</h3>
                      <p className="text-sm font-light text-primary">
                        COP {product.price.toLocaleString("es-CO")}
                      </p>
                  </div>
              </div>
          ))}
      </div>
    </div>
  )
}
