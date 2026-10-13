"use client";

import Link from 'next/link';
import {isUnverifiedLaunchRoute} from '@/shared/config/launch-safety';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Users, 
  ShieldAlert, 
  Activity, 
  Settings,
  Scissors,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/auth/logout-button';

const DOCK_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tenants', icon: Building2, label: 'Negocios' },
  { href: '/admin/independent-professionals', icon: Scissors, label: 'Independientes' },
  { href: '/admin/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { href: '/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/admin/audit', icon: ShieldAlert, label: 'Auditoría' },
  { href: '/admin/metrics', icon: Activity, label: 'Métricas' },
  { href: '/admin/settings', icon: Settings, label: 'Configuración' },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-background min-h-[100vh] text-foreground selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col pb-32">
      {/* Global Ambient Glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen z-0" />

      {/* Main Content Area */}
      <div className="relative z-10 w-full flex-1 flex flex-col">
        {children}
      </div>

      {/* Mac-style Interactive Dock */}
      <AnimatePresence>
        {!(pathname === '/admin' || pathname === '/admin/') && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center gap-2 px-4 py-3 bg-black/60 backdrop-blur-3xl border border-border rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]"
            >
              {DOCK_ITEMS.filter(item=>!isUnverifiedLaunchRoute(item.href)).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className="relative group">
                    {isActive && (
                      <motion.div 
                        layoutId="dock-indicator"
                        className="absolute inset-0 bg-foreground/10 rounded-2xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className={`relative z-10 w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 group-hover:-translate-y-4 group-hover:scale-125 group-hover:bg-amber-500/20 group-hover:shadow-[0_10px_20px_rgba(245,158,11,0.2)] ${isActive ? 'text-amber-500' : 'text-foreground/50'}`}>
                      <item.icon className="w-6 h-6 transition-all duration-300 group-hover:text-amber-400" />
                      
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-border rounded-lg text-[10px] font-headline tracking-[0.2em] text-foreground/90 uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                        {item.label}
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    )}
                  </Link>
                );
              })}
              
              <div className="w-px h-10 bg-foreground/10 mx-2" />
              
              <div className="flex items-center justify-center">
                 <ThemeToggle />
              </div>

              <div className="w-px h-10 bg-foreground/10 mx-2" />
              
              <LogoutButton title="Cerrar sesión" className="relative group">
                <div className="relative z-10 w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 group-hover:-translate-y-4 group-hover:scale-125 group-hover:bg-red-500/20 group-hover:shadow-[0_10px_20px_rgba(239,68,68,0.2)] text-foreground/50">
                  <LogOut className="w-6 h-6 transition-all duration-300 group-hover:text-red-400" />
                  
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-border rounded-lg text-[10px] font-headline tracking-[0.2em] text-foreground/90 uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                    Cerrar Sesión
                  </div>
                </div>
              </LogoutButton>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
