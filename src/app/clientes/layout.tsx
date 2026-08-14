"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/clientes';

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    document.cookie = 'barberia_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (isRoot) {
    return (
      <div className="dark bg-[#050505] min-h-screen text-foreground selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="relative z-10 w-full flex-1 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="dark bg-[#050505] min-h-screen flex flex-col selection:bg-amber-500/30 font-sans text-white relative overflow-hidden">
      
      {/* Luces de Fondo */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Topbar del Cliente */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-20 flex items-center justify-between px-6 md:px-12 shrink-0 relative z-20 bg-black/40 backdrop-blur-3xl border-b border-white/5"
      >
          <div className="flex items-center gap-4">
              <button onClick={() => router.push('/clientes')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-white/60 hover:text-white group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-headline tracking-widest uppercase hidden sm:block">Panel Principal</span>
              </button>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-full transition-all text-red-500/80 hover:text-red-400">
              <span className="text-xs font-headline tracking-widest uppercase hidden sm:block">Cerrar Sesión</span>
              <LogOut className="w-4 h-4 sm:hidden" />
          </button>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col overflow-y-auto">
        <div className="flex-1 px-4 lg:px-10 py-8 pb-20 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
}
