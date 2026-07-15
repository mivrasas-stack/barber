"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Scissors,
  LogOut,
  Briefcase,
  Coffee,
  Wallet,
  ArrowLeft
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dummyBarbers } from '@/app/dashboard/data';

const navItems = [
  { href: '/barber', icon: CalendarDays, label: 'Mi Agenda' },
  { href: '/barber/wallet', icon: Wallet, label: 'Mis Comisiones' },
  { href: '/barber/wait-room', icon: Coffee, label: 'Lounge (Espera)' },
  { href: '/barber/portfolio', icon: Briefcase, label: 'Mi Portafolio' },
];

export default function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/barber';
  const me = dummyBarbers[0]; 

  // When on root /barber, render full-screen like AdminPortal
  if (isRoot) {
    return (
      <div className="dark bg-[#050505] min-h-screen text-foreground selection:bg-amber-500/30 overflow-hidden relative">
        {/* Global Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="relative z-10 w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="dark bg-background min-h-screen text-foreground selection:bg-primary/30">
        <SidebarProvider>
        <Sidebar className="border-r border-white/10 bg-black/80 backdrop-blur-3xl">
            <SidebarHeader className="pt-8 pb-6 px-6">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:bg-primary/40 transition-colors duration-500" />
                        <Avatar className="relative h-20 w-20 border border-primary/30 p-1 bg-black/50 ring-1 ring-primary/20 ring-offset-2 ring-offset-background">
                            <AvatarImage src={me.avatarUrl} alt={me.name} className="rounded-full object-cover" />
                            <AvatarFallback className="bg-transparent text-white font-headline text-2xl">{me.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    
                    <div>
                        <h2 className="text-xl font-headline tracking-widest uppercase text-white">{me.name}</h2>
                        <p className="text-[10px] font-light tracking-[0.2em] text-primary uppercase mt-1">Master Barber</p>
                    </div>
                </div>
            </SidebarHeader>
            <div className="mx-6 h-px bg-white/5 mb-4" />
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
                        className={`h-14 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <Link href={item.href} className="flex items-center gap-4 px-4">
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                        <span className="font-light tracking-wide text-[13px] uppercase">{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                );
                })}
            </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <SidebarMenuButton tooltip="Cerrar Sesión" asChild className="h-14 rounded-xl text-white/60 hover:text-white hover:bg-destructive/20 transition-all px-4">
                <Link href="/">
                    <LogOut className="h-5 w-5" />
                    <span className="font-light tracking-wide text-[13px] uppercase">Cerrar Sesión</span>
                </Link>
                </SidebarMenuButton>
            </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="bg-transparent flex flex-col">
            <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-white/5 bg-background/80 backdrop-blur-xl px-6 lg:px-10">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="text-white hover:text-primary transition-colors" />
                    <div className="h-6 w-px bg-white/10 hidden md:block" />
                    <button onClick={() => router.push('/barber')} className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
                    </button>
                    <div className="h-6 w-px bg-white/10 hidden md:block" />
                    <h2 className="hidden md:block text-sm font-light tracking-widest text-white/60 uppercase">
                        Portal Profesional
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Scissors className="h-4 w-4 text-primary group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-sm font-bold tracking-widest text-white font-headline uppercase leading-none hidden sm:block">BarberParadise</span>
                    </Link>
                </div>
            </header>
            <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full">
                {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </div>
  );
}
