import Link from "next/link";
import {Scissors,CalendarDays,UserRound,House} from "lucide-react";
import {requireActiveUser} from "@/infrastructure/auth/require-active-user";
import {LogoutButton} from "@/components/auth/logout-button";

export default async function CustomerPortalLayout({children}:{children:React.ReactNode}) {
 await requireActiveUser();
 return <div className="min-h-screen bg-background text-foreground">
  <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
   <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 py-4">
    <Link href="/customers" className="font-headline tracking-widest uppercase flex gap-2 items-center">
     <Scissors className="w-5 h-5 text-amber-500"/>Barber Paradise
    </Link>
    <nav aria-label="Navegación de clientes" className="flex gap-4 items-center text-sm">
     <Link className="hover:text-amber-500" href="/customers" title="Inicio"><House className="w-5 h-5 sm:hidden"/><span className="hidden sm:inline">Inicio</span></Link>
     <Link className="hover:text-amber-500" href="/customers/appointments" title="Mis reservas"><CalendarDays className="w-5 h-5 sm:hidden"/><span className="hidden sm:inline">Reservas</span></Link>
     <Link className="hover:text-amber-500" href="/customers/profile" title="Mi perfil"><UserRound className="w-5 h-5 sm:hidden"/><span className="hidden sm:inline">Perfil</span></Link>
     <LogoutButton title="Cerrar sesión" className="rounded-full border border-border px-3 py-2 hover:border-red-400">Salir</LogoutButton>
    </nav>
   </div>
  </header>
  {children}
 </div>;
}
