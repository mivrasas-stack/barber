"use client"
import { Progress } from "@/components/ui/progress"
import { Gift, Star } from "lucide-react"
import { PremiumButton } from "@/components/ui/premium-button"

export function UserPoints() {
  const userPoints = 12450;
  const pointsForReward = 15000;
  
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto">
      <div className="text-center pb-8 border-b border-white/10">
        <h2 className="text-3xl font-headline text-white tracking-wide">STATUS VIP</h2>
        <p className="text-muted-foreground font-light mt-1">El privilegio de pertenecer a nuestro círculo más exclusivo.</p>
      </div>

      <div className="relative overflow-hidden bg-white/5 border border-white/10 p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10 text-center mb-16">
            <p className="text-sm font-headline tracking-[0.3em] uppercase text-primary mb-6">Millas de Estilo</p>
            <p className="text-8xl md:text-9xl font-headline text-white font-bold leading-none tracking-tighter">
              {userPoints.toLocaleString('en-US')}
            </p>
            <p className="text-muted-foreground font-light mt-4 tracking-widest uppercase text-sm">Puntos Acumulados</p>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs tracking-widest uppercase text-muted-foreground">Próximo Nivel</p>
                  <p className="text-lg font-headline text-white tracking-wide">CORTE CORTESÍA</p>
                </div>
                <p className="text-xl font-light text-primary">{userPoints.toLocaleString('en-US')} <span className="text-sm text-muted-foreground">/ {pointsForReward.toLocaleString('en-US')}</span></p>
            </div>
            {/* Custom Premium Progress Bar */}
            <div className="h-1 bg-white/10 w-full overflow-hidden">
                <div 
                  className="h-full bg-primary relative" 
                  style={{ width: `${(userPoints / pointsForReward) * 100}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 blur-sm" />
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-transparent border border-white/10 gap-6">
          <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-primary"/>
              </div>
              <div>
                  <h3 className="text-xl font-headline text-white tracking-wide">RECOMPENSA DISPONIBLE</h3>
                  <p className="text-muted-foreground font-light mt-1">Corte de pelo y asesoría de imagen.</p>
              </div>
          </div>
          <PremiumButton variant="outline" className="w-full md:w-auto" disabled>
              Beneficio Canjeado
          </PremiumButton>
      </div>
    </div>
  )
}
