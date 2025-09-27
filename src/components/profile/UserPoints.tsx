import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Gift, Star } from "lucide-react"

export function UserPoints() {
  const userPoints = 350;
  const pointsForReward = 500;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Puntos y Recompensas</CardTitle>
        <CardDescription>Gana puntos con cada visita y canjéalos por recompensas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center p-6 bg-accent/20 rounded-lg">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Puntos Totales</p>
                <p className="text-5xl font-bold text-primary">350</p>
            </div>
        </div>
        <div>
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Próxima Recompensa: <span className="text-primary">Corte Gratis</span></p>
                <p className="text-sm text-muted-foreground">{userPoints} / {pointsForReward}</p>
            </div>
            <Progress value={(userPoints / pointsForReward) * 100} />
        </div>
        <Card>
            <CardHeader className="flex-row items-center gap-4">
                <Gift className="h-8 w-8 text-primary"/>
                <div>
                    <CardTitle className="text-lg">Canjear Recompensa</CardTitle>
                    <CardDescription>¡Tienes un corte de pelo gratis disponible!</CardDescription>
                </div>
            </CardHeader>
            <CardFooter>
                <Button className="ml-auto" disabled>Canjeado</Button>
            </CardFooter>
        </Card>
      </CardContent>
    </Card>
  )
}
