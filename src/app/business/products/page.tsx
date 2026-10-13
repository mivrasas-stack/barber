"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingBag, Search, Plus, AlertCircle, RefreshCw, Layers } from "lucide-react";
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

export default function AdminProductsPage() {
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
        throw new Error(`Failed to fetch products: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data.products || []);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar catálogo de productos");
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Gestión multi-inquilino de productos, variantes y SKUs para venta en tienda y POS.
          </p>
        </div>
        <div className="flex gap-4">
          <PremiumButton onClick={loadProducts} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </PremiumButton>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por nombre, marca o SKU..."
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

      {/* Products Table */}
      <Card className="bg-foreground/5 border-border overflow-hidden">
        <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
          <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Catálogo Activo ({filtered.length} productos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-foreground/5">
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Producto</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Marca / Cat</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Variantes & SKUs</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Precio Retail</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-light">
                      Cargando productos en tiempo real desde PostgreSQL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-light">
                      No se encontraron productos en el catálogo.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-headline tracking-wide text-foreground">{prod.name}</div>
                        {prod.description && (
                          <div className="text-xs text-muted-foreground font-light truncate max-w-xs">
                            {prod.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-light text-muted-foreground">
                        <div>{prod.brand || "—"}</div>
                        <div className="text-xs text-primary/70">{prod.categoryName || "General"}</div>
                      </td>
                      <td className="p-4 text-sm font-light">
                        <div className="space-y-1">
                          {prod.variants.map((v) => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="font-mono text-xs text-foreground/80 bg-foreground/10 px-2 py-0.5 rounded">
                                {v.sku}
                              </span>
                              {v.name && <span className="text-xs text-muted-foreground">({v.name})</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-headline tracking-wider text-foreground">
                        {prod.variants.length > 0 ? (
                          <span>
                            ${(Number(prod.variants[0].retailPriceMinor) / 100).toLocaleString("es-CO")} COP
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-widest font-headline ${
                            prod.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
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
