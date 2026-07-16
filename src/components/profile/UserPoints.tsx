"use client"
import { Progress } from "@/components/ui/progress"
import { Gift, Star, Crown } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"

export function UserPoints() {
  const userPoints = 12450;
  const pointsForReward = 15000;
  const progressPercentage = (userPoints / pointsForReward) * 100;
  
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="text-center pb-8 border-b border-white/10 flex flex-col items-center">
        <Crown className="w-8 h-8 text-primary mb-4" />
        <h2 className="text-3xl md:text-4xl font-headline text-white tracking-widest uppercase">STATUS VIP</h2>
        <p className="text-muted-foreground font-light mt-2 max-w-md">El privilegio de pertenecer a nuestro círculo más exclusivo de clientes.</p>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 p-12 md:p-16 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.02)] backdrop-blur-sm group">
        {/* Holographic / Light effects */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-1000" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-white/10 transition-colors duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            
            <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-black/40 border border-primary/20 px-4 py-1.5 rounded-full mb-6">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <p className="text-xs font-bold tracking-widest uppercase text-primary">Millas de Estilo</p>
                </div>
                
                <h3 className="text-7xl md:text-8xl lg:text-9xl font-headline font-bold leading-none tracking-tighter bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] text-transparent bg-clip-text drop-shadow-sm">
                  {userPoints.toLocaleString('en-US')}
                </h3>
                <p className="text-white/40 font-light mt-4 tracking-widest uppercase text-sm">Puntos Acumulados</p>
            </div>

            <div className="w-full md:w-1/2 space-y-6 bg-black/20 p-8 rounded-2xl border border-white/5">
                <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-white/40 mb-1">Próximo Nivel</p>
                      <p className="text-lg font-headline text-white tracking-widest uppercase">Corte Cortesía</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-light text-primary">{progressPercentage.toFixed(0)}%</p>
                        <p className="text-[10px] text-white/40 tracking-widest uppercase mt-1">
                            Faltan {(pointsForReward - userPoints).toLocaleString('en-US')} pts
                        </p>
                    </div>
                </div>
                
                {/* Custom Premium Progress Bar */}
                <div className="h-2 bg-black/50 rounded-full w-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[#bf953f] to-[#fcf6ba] relative rounded-full" 
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 blur-sm" />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-2xl gap-6 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-black/50 border border-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  <Gift className="h-6 w-6 text-primary"/>
              </div>
              <div>
                  <h3 className="text-xl font-headline text-white tracking-wide uppercase">Recompensa Disponible</h3>
                  <p className="text-white/60 font-light mt-1">Corte de pelo y asesoría de imagen.</p>
              </div>
          </div>
          <PremiumButton variant="outline" className="w-full md:w-auto border-white/10 text-white/40 bg-black/20" disabled>
              Beneficio Canjeado
          </PremiumButton>
      </div>
    </div>
  )
}
