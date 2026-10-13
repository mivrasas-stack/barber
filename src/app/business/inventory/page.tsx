"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, Search, RefreshCw, AlertCircle, TrendingUp, History, ArrowDownRight, ArrowUpRight } from "lucide-react";
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
    unitCostMinor?: string;
  } | null;
}

interface StockMovementItem {
  id: string;
  locationId: string;
  productVariantId: string;
  movementType: string;
  quantity: number;
  sourceType: string;
  reason?: string;
  occurredAt: string;
}

export default function AdminInventoryPage() {
  const [positions, setPositions] = useState<InventoryPositionItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"positions" | "movements">("positions");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, movRes] = await Promise.all([
        fetch("/api/v1/inventory"),
        fetch("/api/v1/inventory/movements?limit=25"),
      ]);

      if (posRes.ok) {
        const json = await posRes.json();
        setPositions(json.data?.positions || []);
      }
      if (movRes.ok) {
        const json = await movRes.json();
        setMovements(json.data?.movements || []);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPositions = positions.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.variant?.sku.toLowerCase().includes(term) ||
      p.variant?.name?.toLowerCase().includes(term) ||
      p.locationId.toLowerCase().includes(term)
    );
  });

  const totalStockOnHand = positions.reduce((acc, curr) => acc + curr.onHand, 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Libro Mayor de Inventario
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Posiciones físicas en tiempo real y libro contable inmutable de movimientos de stock.
          </p>
        </div>
        <div className="flex gap-4">
          <PremiumButton onClick={loadData} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </PremiumButton>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Total Unidades On-Hand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-primary">
              {totalStockOnHand} <span className="text-sm font-light text-muted-foreground">uds</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              SKUs Monitoreados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-foreground">
              {positions.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Últimos Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-foreground">
              {movements.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("positions")}
          className={`pb-2 px-1 text-sm font-headline tracking-wider uppercase transition-colors ${
            activeTab === "positions"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Posiciones Actuales ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-2 px-1 text-sm font-headline tracking-wider uppercase transition-colors ${
            activeTab === "movements"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Kardex / Movimientos Inmutables ({movements.length})
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por SKU o variante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-foreground/5 border-border text-foreground pl-10 focus-visible:ring-primary h-12"
          />
        </div>
      </div>

      {/* Content Tables */}
      {activeTab === "positions" ? (
        <Card className="bg-foreground/5 border-border overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Posiciones de Stock por Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-foreground/5">
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">SKU / Variante</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">On-Hand</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Reservado</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Disponible</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-light">
                        Consultando posiciones en PostgreSQL...
                      </td>
                    </tr>
                  ) : filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-light">
                        No se registran posiciones de inventario para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="font-mono text-sm text-foreground">{p.variant?.sku || p.productVariantId}</div>
                          {p.variant?.name && (
                            <div className="text-xs text-muted-foreground">{p.variant.name}</div>
                          )}
                        </td>
                        <td className="p-4 font-headline tracking-wider text-foreground">
                          {p.onHand} uds
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {p.reserved} uds
                        </td>
                        <td className="p-4 font-headline tracking-wider text-primary">
                          {p.available} uds
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-widest font-headline ${
                              p.onHand > 5
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : p.onHand > 0
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {p.onHand > 5 ? "Óptimo" : p.onHand > 0 ? "Bajo Stock" : "Agotado"}
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
      ) : (
        <Card className="bg-foreground/5 border-border overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
            <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Auditoría de Movimientos (Kardex)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-foreground/5">
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Fecha</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Tipo</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Cantidad</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Origen</th>
                    <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-light">
                        No hay movimientos registrados en el kardex.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 text-xs font-light text-muted-foreground">
                          {new Date(m.occurredAt).toLocaleString("es-CO")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-mono ${
                              m.movementType.includes("IN") || m.movementType.includes("RECEIPT") || m.movementType.includes("RETURN")
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td className="p-4 font-headline tracking-wider text-foreground">
                          {m.quantity} uds
                        </td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">
                          {m.sourceType}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-light truncate max-w-xs">
                          {m.reason || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
