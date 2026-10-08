"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Scissors,
  LogOut,
  Users,
  DollarSign,
  Activity,
  UserCircle,
  ArrowLeft,
  Wallet,
  UserCheck,
  Building2,
  Receipt,
  Package,
  CreditCard,
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
import { dummyBarbers } from '@/app/clientes/data';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkspaceSwitcher } from '@/components/navigation/workspace-switcher';

const navItems = [
  { href: '/barber/pos', icon: Receipt, label: 'Caja / POS' },
  { href: '/barber/admin/payments', icon: CreditCard, label: 'Pagos Digitales' },
  { href: '/barber/inventory', icon: Package, label: 'Inventario' },
  { href: '/barber/appointments', icon: CalendarDays, label: 'Mi Agenda' },
  { href: '/barber/barberos', icon: Users, label: 'Barberos' },
  { href: '/barber/affiliations', icon: Building2, label: 'Afiliaciones' },
  { href: '/barber/accounting', icon: Wallet, label: 'Contabilidad' },
  { href: '/barber/customers', icon: UserCheck, label: 'Mis Clientes' },
  { href: '/barber/services', icon: Scissors, label: 'Servicios' },
  { href: '/barber/profile', icon: UserCircle, label: 'Mi Perfil' },
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
      <div className="bg-background min-h-screen text-foreground selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
        {/* Global Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="relative z-10 w-full flex-1 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-primary/30">
        <SidebarProvider defaultOpen={false}>
        <Sidebar className="border-r border-border bg-background/95 backdrop-blur-3xl shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
            <SidebarHeader className="pt-10 pb-8 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
                <div className="flex flex-col items-center gap-5 text-center relative z-10">
                    <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/40 transition-colors duration-700" />
                        <Avatar className="relative h-24 w-24 border border-border p-1 bg-foreground/5 ring-2 ring-black shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:border-amber-500/30">
                            <AvatarImage src={me.avatarUrl} alt={me.name} className="rounded-full object-cover" />
                            <AvatarFallback className="bg-transparent text-foreground font-headline text-3xl">{me.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-headline tracking-widest uppercase text-foreground group-hover:text-amber-100 transition-colors">{me.name}</h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <p className="text-[10px] font-headline tracking-[0.3em] text-amber-500 uppercase">Master Barber</p>
                        </div>
                    </div>
                </div>
            </SidebarHeader>
            <div className="mx-8 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent mb-6" />
            
            <SidebarContent className="px-6 py-2">
            <SidebarMenu className="gap-3">
                {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={`h-14 rounded-2xl transition-all duration-500 relative overflow-hidden group ${isActive ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'}`}
                    >
                        <Link href={item.href} className="flex items-center gap-5 px-6">
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                        <item.icon className={`h-5 w-5 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-amber-500' : 'text-foreground/40 group-hover:text-amber-400'}`} />
                        <span className="font-headline tracking-[0.2em] text-[11px] uppercase">{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                );
                })}
            </SidebarMenu>
            </SidebarContent>
            
            <SidebarFooter className="p-6">
                <SidebarMenuButton tooltip="Cerrar Sesión" asChild className="h-14 rounded-2xl text-foreground/40 hover:text-foreground hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all duration-500 px-6 group">
                <Link href="/">
                    <LogOut className="h-5 w-5 transition-transform duration-500 group-hover:-translate-x-1 group-hover:text-red-400" />
                    <span className="font-headline tracking-[0.2em] text-[11px] uppercase group-hover:text-red-100">Cerrar Sesión</span>
                </Link>
                </SidebarMenuButton>
            </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="bg-transparent flex flex-col">
            <header className="sticky top-0 z-30 flex h-24 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-2xl px-6 lg:px-12 shadow-sm">
                <div className="flex items-center gap-6">
                    <SidebarTrigger className="text-foreground/60 hover:text-amber-500 transition-colors w-12 h-12 rounded-2xl hover:bg-amber-500/10 flex items-center justify-center" />
                    <WorkspaceSwitcher />
                    <div className="h-8 w-px bg-foreground/5 hidden md:block" />
                    <button onClick={() => router.push('/barber')} className="text-foreground/40 hover:text-foreground transition-colors flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-headline tracking-[0.2em] uppercase hidden sm:block">Volver</span>
                    </button>
                    <div className="h-8 w-px bg-foreground/5 hidden md:block" />
                    <h2 className="hidden md:block text-[10px] font-headline tracking-[0.25em] text-foreground/30 uppercase">
                        Portal Profesional
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Link href="/barber" className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="MIVRA BARBER Logo" className="h-10 w-10 rounded-xl object-cover shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform duration-500" />
                        <span className="text-[12px] font-bold tracking-[0.25em] text-foreground font-headline uppercase leading-none hidden sm:block group-hover:text-amber-400 transition-colors">MivraBarber</span>
                    </Link>
                </div>
            </header>
            <main className="flex-1 p-6 lg:p-12 max-w-6xl mx-auto w-full">
                {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </div>
  );
}
