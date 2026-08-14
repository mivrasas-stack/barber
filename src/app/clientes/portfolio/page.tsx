"use client";

import React, { useState } from 'react';
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Edit2, Trash2 } from "lucide-react";
import { dummyPortfolioItems } from "../data";
import type { PortfolioItem } from '@/lib/types';
import { AddPortfolioItemForm } from '@/components/dashboard/AddPortfolioItemForm';

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(dummyPortfolioItems);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const handleOpenForm = (item: PortfolioItem | null = null) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = (itemData: Omit<PortfolioItem, 'id'> | PortfolioItem) => {
    if ('id' in itemData) {
      // Editing existing item
      const updatedItems = portfolioItems.map(p => p.id === itemData.id ? { ...p, ...itemData } : p);
      setPortfolioItems(updatedItems);
      const dummyIndex = dummyPortfolioItems.findIndex(p => p.id === itemData.id);
      if (dummyIndex !== -1) {
          dummyPortfolioItems[dummyIndex] = { ...dummyPortfolioItems[dummyIndex], ...itemData };
      }
    } else {
      // Adding new item
      const newItem = { ...itemData, id: `PORT${portfolioItems.length + 1}` };
      const updatedItems = [...portfolioItems, newItem];
      setPortfolioItems(updatedItems);
      dummyPortfolioItems.push(newItem);
    }
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = portfolioItems.filter(p => p.id !== itemId);
    setPortfolioItems(updatedItems);
    const dummyIndex = dummyPortfolioItems.findIndex(p => p.id === itemId);
    if (dummyIndex !== -1) {
      dummyPortfolioItems.splice(dummyIndex, 1);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="Portafolio Premium">
        <Button size="sm" className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 border border-amber-900/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]" onClick={() => handleOpenForm()}>
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap font-medium tracking-wide">
            Añadir Estilo
          </span>
        </Button>
      </PageHeader>

      <AddPortfolioItemForm
        isOpen={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setEditingItem(null);
        }}
        onSaveItem={handleSaveItem}
        existingItem={editingItem}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[300px]">
        <AnimatePresence>
          {portfolioItems.map((item, index) => {
            // Creative asymmetrical grid logic
            const isLarge = index % 5 === 0 || index % 7 === 0;
            const isWide = index % 4 === 0 && !isLarge;
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 shadow-2xl ${
                  isLarge ? 'md:col-span-2 md:row-span-2' : isWide ? 'md:col-span-2' : ''
                }`}
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: "0 20px 40px -10px rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.3)"
                }}
              >
                <div className="absolute inset-0 w-full h-full bg-zinc-950">
                  <Image
                    alt={item.description}
                    className="object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-80"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    src={item.imageUrl}
                  />
                  {/* Luxury overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <div className="flex justify-end w-full">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-black/50 hover:bg-amber-500 hover:text-black backdrop-blur-md border border-white/10 transition-colors shadow-lg">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-950/90 backdrop-blur-xl border-zinc-800 shadow-2xl">
                        <DropdownMenuLabel className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Opciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenForm(item)} className="focus:bg-zinc-800/50 focus:text-amber-500 cursor-pointer transition-colors">
                          <Edit2 className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteItem(item.id)} className="focus:bg-red-950/50 focus:text-red-500 text-red-500 cursor-pointer transition-colors">
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-3 transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-black/50 border border-amber-500/30 text-amber-500 text-xs font-semibold tracking-widest uppercase backdrop-blur-md shadow-lg">
                      {item.category}
                    </span>
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-wide drop-shadow-lg">
                      {item.description}
                    </h3>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
