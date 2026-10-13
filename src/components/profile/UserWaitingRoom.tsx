"use client"
import Image from "next/image"
import { dummyWaitingRoomProducts } from "@/app/clientes/data"
import { useToast } from "@/hooks/use-toast"
import { useWaitRoom } from "@/hooks/use-wait-room"
import type { WaitingRoomProduct } from "@/lib/types"
import { PremiumButton } from "@/components/ui/premium-button"
import { Coffee } from "lucide-react"

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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-headline text-foreground tracking-widest uppercase">LOUNGE VIP</h2>
          </div>
          <p className="text-muted-foreground font-light">Disfruta de nuestra selección de cortesía mientras esperas tu turno.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {dummyWaitingRoomProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="group relative flex flex-col bg-foreground/5 border border-border rounded-2xl overflow-hidden hover:bg-foreground/[0.05] hover:border-border hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                      <Image
                        alt={product.name}
                        fill
                        src={product.imageUrl}
                        className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />
                      
                      {/* Price Tag */}
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-border px-3 py-1 rounded-full">
                          <span className="text-xs font-headline tracking-widest text-primary">
                            COP {product.price.toLocaleString("es-CO")}
                          </span>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col">
                          <h3 className="text-xl font-headline text-foreground tracking-wide mb-1 drop-shadow-md">{product.name}</h3>
                          <div className="h-0 group-hover:h-12 opacity-0 group-hover:opacity-100 transition-all duration-500 overflow-hidden flex items-end mt-2">
                              <PremiumButton 
                                variant="glass" 
                                size="sm" 
                                className="w-full text-xs font-bold uppercase tracking-widest bg-foreground/10 hover:bg-white/20 text-foreground border-border"
                                onClick={() => handleOrder(product)}
                              >
                                  Solicitar
                              </PremiumButton>
                          </div>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  )
}

