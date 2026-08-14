"use client";

import React from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserCart } from '@/components/profile/UserCart';
import { UserWaitRoomCart } from '@/components/profile/UserWaitRoomCart';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground selection:bg-amber-500/30 overflow-x-hidden relative flex flex-col">
      {/* Global Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Top Navigation Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 h-[72px]"
      >
        {/* Logo */}
        <Link href="/portal" className="flex items-center gap-3 md:gap-4 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="MIVRA BARBER Logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
          <span className="font-bold tracking-widest text-base sm:text-xl md:text-2xl uppercase text-white">
            Cliente<span className="text-amber-500">Portal</span>
          </span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          <UserWaitRoomCart />
          <UserCart />
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <button
            onClick={() => {
              document.cookie = 'barberia_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </motion.div>

      <div className="relative z-10 w-full pt-[72px] flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
