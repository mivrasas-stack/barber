import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bienvenido de Vuelta</CardTitle>
          <CardDescription>Ingresa a tu cuenta para gestionar tus citas</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="nelson@barberparadise.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 as-child">
              {/* This should be conditional based on user role */}
              <Link href="/profile">Iniciar Sesión</Link>
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="underline">
              Regístrate
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link href="/" className="underline text-muted-foreground hover:text-primary">
              &larr; Volver a la página web
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}