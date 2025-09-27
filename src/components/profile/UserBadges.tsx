import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Award, Calendar, Gem, Star } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const badges = [
    { icon: Star, title: "Primer Corte", description: "Completaste tu primera cita.", earned: true },
    { icon: Calendar, title: "Cliente Frecuente", description: "5 visitas en un mes.", earned: true },
    { icon: Award, title: "Lealtad de Oro", description: "25 citas completadas.", earned: false },
    { icon: Gem, title: "Embajador", description: "Recomienda a 5 amigos.", earned: false },
]

export function UserBadges() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Insignias</CardTitle>
        <CardDescription>Desbloquea logros y presume tu lealtad.</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {badges.map((badge, index) => (
                <Tooltip key={index}>
                    <TooltipTrigger asChild>
                        <div className={`flex flex-col items-center p-4 rounded-lg border ${badge.earned ? 'border-primary bg-primary/10' : 'bg-muted/50'}`}>
                            <badge.icon className={`h-10 w-10 mb-2 ${badge.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="text-sm font-semibold">{badge.title}</p>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{badge.description}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
            </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
