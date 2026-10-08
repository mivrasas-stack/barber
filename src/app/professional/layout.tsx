"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Scissors,
  Users,
  Building2,
  UserCircle,
  DollarSign,
  LogOut,
  Sparkles,
  ExternalLink,
  ShoppingBag,
  Package,
  Receipt,
  CreditCard,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceSwitcher } from "@/components/navigation/workspace-switcher";

export default function ProfessionalWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [effectiveModules, setEffectiveModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, modsRes] = await Promise.all([
          fetch("/api/v1/professionals/me"),
          fetch("/api/v1/professionals/me/modules"),
        ]);

        if (meRes.ok) {
          const d = await meRes.json();
          setProfile(d.profile || null);
        }

        if (modsRes.ok) {
          const d = await modsRes.json();
          const map: Record<string, boolean> = {};
          (d.modules || []).forEach((m: any) => {
            map[m.code] = m.isEnabled;
          });
          setEffectiveModules(map);
        }
      } catch (err) {
        console.error("Failed to fetch professional workspace data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const navItems: Array<{
    code: string;
    href: string;
    icon: any;
    label: string;
    comingSoon?: boolean;
  }> = [
    {
      code: "core.dashboard",
      href: "/professional",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      code: "scheduling.calendar",
      href: "/professional/appointments",
      icon: Calendar,
      label: "Mi Agenda",
    },
    {
      code: "scheduling.availability",
      href: "/professional/availability",
      icon: Clock,
      label: "Mis Horarios",
    },
    {
      code: "catalog.services",
      href: "/professional/services",
      icon: Scissors,
      label: "Mis Servicios",
    },
    {
      code: "customers.directory",
      href: "/professional/customers",
      icon: Users,
      label: "Mis Clientes",
    },
    {
      code: "affiliations.management",
      href: "/professional/affiliations",
      icon: Building2,
      label: "Sedes Afiliadas",
    },
    {
      code: "profile.public",
      href: "/professional/profile",
      icon: UserCircle,
      label: "Mi Perfil Web",
    },
    {
      code: "finance.overview",
      href: "/professional/finance",
      icon: DollarSign,
      label: "Finanzas",
    },
    {
      code: "pos.checkout",
      href: "/professional/pos",
      icon: Receipt,
      label: "Caja / POS",
    },
    {
      code: "commerce.products",
      href: "/professional/products",
      icon: ShoppingBag,
      label: "Mis Productos",
    },
    {
      code: "inventory.stock",
      href: "/professional/inventory",
      icon: Package,
      label: "Mi Inventario",
    },
    {
      code: "commerce.orders",
      href: "/professional/orders",
      icon: Receipt,
      label: "Mis Ventas",
    },
    {
      code: "payments.core",
      href: "/professional/payments",
      icon: CreditCard,
      label: "Cobros Digitales",
    },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-amber-500/30">
      <SidebarProvider defaultOpen={true}>
        <Sidebar className="border-r border-border bg-background/95 backdrop-blur-3xl shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
          <SidebarHeader className="pt-6 pb-4 px-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-headline font-bold text-sm tracking-wider text-foreground truncate">
                  SOLO WORKSPACE
                </span>
                <span className="text-[10px] text-amber-500 font-mono tracking-widest uppercase">
                  {profile?.displayName || "Barbero Profesional"}
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-4 py-4">
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const isEnabled = effectiveModules[item.code] !== false;
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem key={item.code}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={`h-10 rounded-xl px-3 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-amber-500/15 text-amber-500 font-semibold border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.comingSoon && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] py-0 px-1 font-mono uppercase bg-muted text-muted-foreground"
                          >
                            Pronto
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border/40 space-y-3">
            {profile?.professionalSlug && (
              <a
                href={`/${profile.professionalSlug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 hover:bg-amber-500/20 transition-colors"
              >
                <span className="truncate text-[11px] font-mono">
                  /{profile.professionalSlug}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1" />
              </a>
            )}

            <div className="flex items-center justify-between pt-1">
              <Link
                href="/login"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </Link>
              <ThemeToggle />
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1">
          {/* Top Navbar */}
          <header className="h-16 border-b border-border/40 px-6 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <WorkspaceSwitcher />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-semibold text-foreground">
                  {profile?.displayName || "Carlos Mendoza"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Independiente (OWNER)
                </span>
              </div>
              <Avatar className="w-8 h-8 border border-border">
                <AvatarFallback className="bg-amber-500/20 text-amber-500 font-bold text-xs">
                  {profile?.displayName ? profile.displayName.charAt(0) : "C"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 md:p-10 flex-1 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
