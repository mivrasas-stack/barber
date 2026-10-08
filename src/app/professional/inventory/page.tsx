"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, Search, RefreshCw, AlertCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

interface InventoryPositionItem {
  id: string;
  locationId: string;
  productVariantId: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
  variant?: {
    id: string;
    sku: string;
    name?: string;
    priceMinor: string;
  } | null;
}

export default function ProfessionalInventoryPage() {
  const [positions, setPositions] = useState<InventoryPositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/inventory");
      if (!res.ok) throw new Error(`Failed to load inventory: ${res.statusText}`);
      const json = await res.json();
      setPositions(json.data?.positions || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar stock independiente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  const filtered = positions.filter(
    (p) =>
      p.variant?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOnHand = positions.reduce((acc, curr) => acc + curr.onHand, 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Mi Inventario & Custodia
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Control de mercancía de tu propiedad en custodia dentro de las sedes y barberías anfitrionas.
          </p>
        </div>
        <div className="flex gap-4">
          <PremiumButton onClick={loadPositions} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Total Unidades Propias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-primary">
              {totalOnHand} <span className="text-sm font-light text-muted-foreground">uds</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Posiciones / SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-foreground">
              {positions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por SKU o producto..."
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
            <Package className="w-4 h-4 text-primary" />
            Stock Propio por Sede ({filtered.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-foreground/5">
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">SKU / Producto</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Ubicación / Sede</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">En Mano</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-light">
                      Consultando inventario en PostgreSQL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-light">
                      No tienes mercancía registrada en custodia.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-sm text-foreground">{p.variant?.sku || p.productVariantId}</div>
                        {p.variant?.name && <div className="text-xs text-muted-foreground">{p.variant.name}</div>}
                      </td>
                      <td className="p-4 text-sm font-light text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span className="truncate max-w-xs">{p.locationId}</span>
                      </td>
                      <td className="p-4 font-headline tracking-wider text-foreground">
                        {p.onHand} uds
                      </td>
                      <td className="p-4 font-headline tracking-wider text-primary">
                        {p.available} uds
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
