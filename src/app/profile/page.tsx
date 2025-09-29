import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserWaitingRoom } from "@/components/profile/UserWaitingRoom"
import { UserPoints } from "@/components/profile/UserPoints"
import { UserBadges } from "@/components/profile/UserBadges"
import { Edit, LogOut, Settings } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 w-full border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-2xl font-bold font-headline tracking-wider text-primary">
                BarberParadise
            </Link>
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/settings"><Settings className="h-5 w-5"/></Link>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/"><LogOut className="h-5 w-5"/></Link>
                </Button>
            </div>
        </div>
      </header>
      <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-8 md:gap-8">
          <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                  <Card>
                  <CardHeader className="flex flex-col items-center text-center">
                      <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src="https://picsum.photos/seed/user-profile/200/200" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-2xl">John Doe</CardTitle>
                      <CardDescription>john.d@example.com</CardDescription>
                      <Button size="sm" variant="outline" className="mt-4">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Perfil
                      </Button>
                  </CardHeader>
                  <CardContent className="text-sm text-center text-muted-foreground">
                      <p>Miembro desde: 25 de Octubre, 2023</p>
                  </CardContent>
                  </Card>
              </div>
              <div className="md:col-span-2">
                  <Tabs defaultValue="waiting-room">
                      <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="waiting-room">Sala de Espera</TabsTrigger>
                      <TabsTrigger value="points">Puntos</TabsTrigger>
                      <TabsTrigger value="badges">Insignias</TabsTrigger>
                      </TabsList>
                      <TabsContent value="waiting-room">
                          <UserWaitingRoom />
                      </TabsContent>
                      <TabsContent value="points">
                         <UserPoints />
                      </TabsContent>
                      <TabsContent value="badges">
                          <UserBadges />
                      </TabsContent>
                  </Tabs>
              </div>
          </div>
      </main>
    </div>
  )
}
