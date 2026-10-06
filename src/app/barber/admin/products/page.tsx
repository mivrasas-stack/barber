"use client";
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dummyProducts } from "@/app/clientes/data";
import { ShoppingBag, Search, Plus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import Image from "next/image";

export default function AdminProducts() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Boutique (Inventario)
            </h1>
            <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Gestión de productos premium para venta al cliente.
            </p>
        </div>
        <div className="flex gap-4">
            <PremiumButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Agregar Producto
            </PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input 
                placeholder="Buscar por nombre o ID..." 
                className="w-full bg-foreground/5 border-border text-foreground pl-10 focus-visible:ring-primary h-12"
              />
          </div>
      </div>

      {/* Products Table */}
      <Card className="bg-foreground/5 border-border overflow-hidden">
        <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Catálogo Actual
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-foreground/5">
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Producto</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Precio</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Stock Actual</th>
                            <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {dummyProducts.map(product => {
                            const isLowStock = product.stock <= product.stockMin;
                            return (
                                <tr key={product.id} className="hover:bg-foreground/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12 rounded-lg bg-foreground/5 border border-border flex items-center justify-center p-2">
                                                <Image src={product.imageUrl} alt={product.name} fill className="object-contain" />
                                            </div>
                                            <div>
                                                <div className="font-headline text-foreground tracking-wide text-lg">{product.name}</div>
                                                <div className="text-[10px] tracking-widest text-foreground/40 uppercase">ID: {product.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-light text-foreground">
                                            COP {product.price.toLocaleString('es-CO')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-headline text-lg ${isLowStock ? 'text-yellow-500' : 'text-foreground'}`}>
                                                {product.stock}
                                            </span>
                                            <span className="text-[10px] tracking-widest text-foreground/40 uppercase">/ Mín {product.stockMin}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {isLowStock ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-headline tracking-widest uppercase border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                <AlertTriangle className="w-3 h-3" /> Reabastecer
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-headline tracking-widest uppercase border bg-green-500/10 text-green-500 border-green-500/20">
                                                Óptimo
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
