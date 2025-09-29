"use client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dummyAppointments } from "@/app/dashboard/data"
import Link from "next/link"

export function UserAppointments() {
  const userAppointments = dummyAppointments.filter(a => a.customerName === "John Doe");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Citas</CardTitle>
        <CardDescription>Aquí puedes ver tu historial de citas y gestionar las próximas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {userAppointments.map(appointment => (
          <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-semibold">{appointment.service}</p>
              <p className="text-sm text-muted-foreground">{appointment.date}</p>
            </div>
            <div className="flex items-center gap-2">
                 <Badge 
                  variant={
                    appointment.status === 'Completada' ? 'default' :
                    appointment.status === 'Confirmada' ? 'secondary':
                    appointment.status === 'Cancelada' ? 'destructive' :
                    'outline'
                  }
                  className={appointment.status === 'Confirmada' ? 'bg-green-600/20 text-green-400 border-green-600/40' : ''}
                >
                  {appointment.status}
                </Badge>
                {appointment.status === "Confirmada" && (
                    <Button variant="outline" size="sm">Cancelar</Button>
                )}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild>
          <Link href="/#services">Agendar Nueva Cita</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
