"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingBag, Search, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

interface ProductVariant {
  id: string;
  sku: string;
  name?: string;
  retailPriceMinor: string;
  unitCostMinor?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  status: string;
  trackInventory: boolean;
  categoryName?: string;
  variants: ProductVariant[];
}

export default function ProfessionalProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/products");
      if (!res.ok) {
        throw new Error(`Failed to load products: ${res.statusText}`);
      }
      const json = await res.json();
      setProducts(json.data?.products || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar productos privados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Mis Productos
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Catálogo propio de productos y mercancía para venta directa en tu silla o workspace independiente.
          </p>
        </div>
        <div className="flex gap-4">
          <PremiumButton onClick={loadProducts} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </PremiumButton>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-foreground/5 border-border text-foreground pl-10 focus-visible:ring-primary h-12"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="bg-foreground/5 border-border overflow-hidden">
        <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
          <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Catálogo Privado ({filtered.length} productos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-foreground/5">
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Producto</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">SKU</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Precio Retail</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-light">
                      Cargando productos de tu workspace...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-light">
                      No tienes productos registrados en tu catálogo independiente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-headline tracking-wide text-foreground">{prod.name}</div>
                        {prod.brand && <div className="text-xs text-muted-foreground">{prod.brand}</div>}
                      </td>
                      <td className="p-4 font-mono text-xs text-foreground/80">
                        {prod.variants.map((v) => v.sku).join(", ") || "—"}
                      </td>
                      <td className="p-4 font-headline tracking-wider text-foreground">
                        {prod.variants.length > 0
                          ? `$${(Number(prod.variants[0].retailPriceMinor) / 100).toLocaleString("es-CO")} COP`
                          : "—"}
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2.5 py-1 rounded-full uppercase tracking-widest font-headline bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {prod.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
