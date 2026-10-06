"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  ShoppingBag,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Package,
  ClipboardList,
  Briefcase,
  UserCheck,
  MapPin,
  ArrowLeft,
  ShieldCheck,
  BellRing,
  Lock
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { dummyLocations } from '@/app/clientes/data';

const navItems = [
  { href: '/barber/admin', icon: LayoutDashboard, label: 'Panel' },
  { href: '/barber/admin/customers', icon: Users, label: 'Clientes VIP' },
  { href: '/barber/admin/appointments', icon: Calendar, label: 'Agenda Global' },
  { href: '/barber/admin/barberos', icon: UserCheck, label: 'Staff' },
  { href: '/barber/admin/accounting', icon: CreditCard, label: 'Finanzas' },
  { href: '/barber/admin/products', icon: ShoppingBag, label: 'Boutique (Inv)' },
  { href: '/barber/admin/services', icon: Scissors, label: 'Servicios' },
  { href: '/barber/admin/settings', icon: Settings, label: 'Configuración' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/barber/admin';

  return (
    <div className="dark bg-background min-h-screen text-foreground selection:bg-primary/30">
        <SidebarProvider>
        {!isRoot && (
        <Sidebar className="border-r border-border bg-black/50 backdrop-blur-xl">
            <SidebarHeader className="pt-6 pb-4 px-4">
            <div className="flex flex-col gap-6">
                <Link href="/barber/admin" className="flex items-center gap-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Scissors className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-widest text-foreground font-headline uppercase leading-none">Barber</span>
                        <span className="text-sm font-light tracking-[0.2em] text-primary uppercase leading-none mt-1">Paradise</span>
                    </div>
                </Link>
                
                {/* Multi-Location Selector */}
                <div className="space-y-2">
                    <p className="text-[10px] font-headline tracking-widest text-foreground/40 uppercase pl-1">Sede Activa</p>
                    <Select defaultValue={dummyLocations[0].id}>
                        <SelectTrigger className="w-full bg-foreground/5 border-border text-foreground h-12 rounded-xl focus:ring-primary/50">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                <SelectValue placeholder="Selecciona una sede" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                            {dummyLocations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id} className="focus:bg-foreground/10 focus:text-foreground cursor-pointer">
                                    {loc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            </SidebarHeader>
            <SidebarContent className="px-4 py-2">
            <SidebarMenu className="gap-2">
                {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={`h-12 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'}`}
                    >
                        <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className="font-light tracking-wide text-sm">{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                );
                })}
            </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <SidebarMenuButton tooltip="Cerrar Sesión" asChild className="h-12 rounded-xl text-foreground/60 hover:text-foreground hover:bg-destructive/20 transition-all">
                <Link href="/">
                    <LogOut className="h-5 w-5" />
                    <span className="font-light tracking-wide text-sm">Cerrar Sesión</span>
                </Link>
                </SidebarMenuButton>
            </SidebarFooter>
        </Sidebar>
        )}
        
        <SidebarInset className="bg-transparent flex flex-col">
            <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6 lg:px-10">
                <div className="flex items-center gap-4">
                    {!isRoot && <SidebarTrigger className="text-foreground hover:text-primary transition-colors" />}
                    {!isRoot && <div className="h-6 w-px bg-foreground/10 hidden md:block" />}
                    <button onClick={() => router.push('/barber/admin')} className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
                    </button>
                    <div className="h-6 w-px bg-foreground/10 hidden md:block" />
                    <h2 className="hidden md:block text-sm font-light tracking-widest text-foreground/60 uppercase">
                        Portal Administrativo
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-foreground/5 border border-border rounded-full py-1.5 px-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-light text-foreground tracking-wide">Sistema Operativo</span>
                    </div>
                </div>
            </header>
            <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </div>
  );
}
