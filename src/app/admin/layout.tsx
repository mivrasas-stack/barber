"use client";

import Link from 'next/link';
import { Moon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark bg-[#050505] min-h-[100vh] text-foreground selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
      {/* Global Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Top Navigation Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 py-3 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 h-[72px]"
      >
        <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="MIVRA BARBER Logo" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <span className="font-headline tracking-widest text-[clamp(1rem,2vw,1.5rem)] uppercase text-white">
            Admin<span className="text-amber-500">Portal</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <button className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <Moon className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <Link href="/" className="flex items-center gap-2 px-3 sm:px-4 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-headline tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Link>
        </div>
      </motion.div>

      <div className="relative z-10 w-full flex-1 flex flex-col pt-[72px]">
        {children}
      </div>
    </div>
  );
}
