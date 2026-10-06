"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Edit2, Trash2 } from 'lucide-react';
import { PremiumButton } from '@/components/ui/premium-button';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const inventoryItems = [
    { id: 1, name: "Cera Mate Barber", category: "Ceras y Pomadas", stock: 15, price: "$25.00", status: "Óptimo" },
    { id: 2, name: "Minoxidil 5%", category: "Tratamientos", stock: 3, price: "$45.00", status: "Bajo" },
    { id: 3, name: "Shampoo Anticaspa", category: "Cuidado Capilar", stock: 0, price: "$18.00", status: "Agotado" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border py-6">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/barber" className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-light tracking-widest uppercase hidden sm:block">Volver</span>
            </Link>
            <h1 className="text-xl font-headline tracking-widest text-primary uppercase">Inventario</h1>
            <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-6 md:px-12 py-12 flex-1 max-w-6xl">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-headline text-foreground tracking-widest uppercase">Gestión de Insumos</h2>
            <p className="text-muted-foreground font-light tracking-wide mt-2">Controla los productos disponibles para la venta y uso en la barbería.</p>
          </div>
          <PremiumButton className="w-full md:w-auto flex items-center gap-2">
            <Plus className="w-5 h-5" /> Añadir Producto
          </PremiumButton>
        </div>

        <div className="bg-foreground/5 border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-border text-xs uppercase tracking-widest text-foreground/60">
                  <th className="p-4 sm:p-6 font-medium">Producto</th>
                  <th className="p-4 sm:p-6 font-medium hidden sm:table-cell">Categoría</th>
                  <th className="p-4 sm:p-6 font-medium">Stock</th>
                  <th className="p-4 sm:p-6 font-medium hidden md:table-cell">Precio Base</th>
                  <th className="p-4 sm:p-6 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-headline tracking-widest text-foreground">{item.name}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden mt-1">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 hidden sm:table-cell text-sm text-foreground/70">
                      {item.category}
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-medium">{item.stock}</span>
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 
                          ${item.status === 'Óptimo' ? 'bg-green-500/10 text-green-500' : 
                            item.status === 'Bajo' ? 'bg-amber-500/10 text-amber-500' : 
                            'bg-red-500/10 text-red-500'}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 hidden md:table-cell text-sm text-foreground/70">
                      {item.price}
                    </td>
                    <td className="p-4 sm:p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:bg-red-500/10 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
