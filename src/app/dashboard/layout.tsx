"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/dashboard/appointments', icon: Calendar, label: 'Citas' },
  { href: '/dashboard/services', icon: Scissors, label: 'Servicios' },
  { href: '/dashboard/products', icon: ShoppingBag, label: 'Productos' },
  { href: '/dashboard/customers', icon: Users, label: 'Clientes' },
  { href: '/dashboard/accounting', icon: CreditCard, label: 'Contabilidad' },
  { href: '/dashboard/saved-objects', icon: Package, label: 'Guardar Objetos' },
  { href: '/dashboard/waiting-room', icon: ClipboardList, label: 'Sala de Espera' },
  { href: '/dashboard/portfolio', icon: Briefcase, label: 'Portafolio' },
  { href: '/dashboard/settings', icon: Settings, label: 'Ajustes' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-8 w-fit p-1">
              <Scissors className="h-6 w-6 text-primary" />
            </Button>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-wider text-primary font-headline">BarberParadise</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenuButton tooltip="Cerrar Sesión" asChild>
              <Link href="/">
                <LogOut />
                <span className='sr-only'>Cerrar Sesión</span>
              </Link>
            </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="relative ml-auto flex-1 md:grow-0">
                {/* Optional Search Bar */}
            </div>
            <Button asChild variant="ghost" size="icon">
                <Link href="/">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Link>
            </Button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 ">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
