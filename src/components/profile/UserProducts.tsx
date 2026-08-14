"use client"
import Image from "next/image"
import { dummyProducts } from "@/app/clientes/data"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import type { Product } from "@/lib/types"
import { PremiumButton } from "@/components/ui/premium-button"
import { Sparkles, Star, ShoppingBag } from "lucide-react"

export function UserProducts() {
  const { toast } = useToast()
  const { addToCart } = useCart()

  const handleAddToCart = (product: Product) => {
    addToCart(product)
    toast({
      title: "Boutique",
      description: `${product.name} ha sido añadido a tu bolsa.`,
    })
  }
  
  if (dummyProducts.length === 0) return null;

  // Simulate a featured product (e.g., the most expensive or a specific one)
  const featuredProduct = dummyProducts[0];
  const regularProducts = dummyProducts.slice(1);

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">LA BOUTIQUE</h2>
            </div>
            <p className="text-muted-foreground font-light">El cuidado premium no termina cuando sales de la silla.</p>
        </div>
      </div>
      
      {/* Featured Product Banner (Upselling) */}
      <div className="relative overflow-hidden bg-[#0a0a0a] border border-white/5 group cursor-default rounded-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-white/10 transition-colors duration-1000" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center p-8 md:p-16 gap-8 md:gap-16">
              
              {/* Image Side */}
              <div className="w-full md:w-1/2 relative aspect-square flex items-center justify-center bg-transparent">
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 text-primary border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md z-20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">Recomendación del Barbero</span>
                  </div>
                  <div className="relative w-full h-full transform transition-transform duration-1000 group-hover:scale-105">
                      <Image
                        alt={featuredProduct.name}
                        fill
                        src={featuredProduct.imageUrl}
                        className="object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                      />
                  </div>
              </div>

              {/* Content Side */}
              <div className="w-full md:w-1/2 space-y-8 text-center md:text-left">
                  <div>
                      <h3 className="text-4xl md:text-5xl font-headline text-white mb-4 tracking-wide uppercase">
                        {featuredProduct.name}
                      </h3>
                      <div className="flex items-center justify-center md:justify-start gap-1 text-primary mb-6">
                          {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-primary" />)}
                          <span className="text-xs text-white/40 ml-2 font-light uppercase tracking-widest">(128 reseñas)</span>
                      </div>
                      <p className="text-muted-foreground font-light text-lg leading-relaxed max-w-xl">
                          La fórmula secreta para mantener el estilo intacto. Este producto ha sido seleccionado por nuestros maestros barberos como el esencial definitivo para tu rutina de cuidado personal.
                      </p>
                  </div>
                  
                  <div className="pt-6 flex flex-col sm:flex-row items-center gap-8 border-t border-white/5">
                      <span className="text-3xl font-light text-white tracking-wide">
                        COP {featuredProduct.price.toLocaleString("es-CO")}
                      </span>
                      <PremiumButton 
                        className="w-full sm:w-auto px-12 h-14"
                        onClick={() => handleAddToCart(featuredProduct)}
                      >
                          Adquirir Ahora
                      </PremiumButton>
                  </div>
              </div>
          </div>
      </div>

      {/* Cross-selling Grid */}
      {regularProducts.length > 0 && (
          <div className="space-y-8">
              <div className="flex items-center justify-between">
                  <h3 className="text-xl font-headline text-white/60 tracking-widest uppercase">Completa tu Rutina</h3>
                  <div className="h-px bg-white/10 flex-1 ml-6" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularProducts.map((product, index) => (
                      <div 
                        key={product.id} 
                        className="group flex flex-col items-center text-center bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
                        style={{ animationDelay: `${index * 150}ms` }}
                      >
                          <div className="relative w-full aspect-square mb-8 flex items-center justify-center">
                              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                              <div className="relative w-full h-full transform transition-transform duration-700 group-hover:scale-110">
                                  <Image
                                    alt={product.name}
                                    fill
                                    src={product.imageUrl}
                                    className="object-contain filter drop-shadow-xl"
                                  />
                              </div>
                          </div>
                          
                          <h4 className="text-lg font-headline text-white mb-2 tracking-wide uppercase">{product.name}</h4>
                          <p className="text-sm font-light text-white/40 mb-6">Cuidado Esencial</p>
                          
                          <div className="mt-auto flex flex-col items-center gap-4 w-full pt-6 border-t border-white/5">
                              <span className="text-lg font-light text-white">
                                COP {product.price.toLocaleString("es-CO")}
                              </span>
                              <PremiumButton 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs tracking-widest group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300 uppercase font-bold" 
                                onClick={() => handleAddToCart(product)}
                              >
                                  Añadir a la Bolsa
                              </PremiumButton>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  )
}

