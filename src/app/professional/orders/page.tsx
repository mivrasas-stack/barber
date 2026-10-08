"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Receipt, Search, RefreshCw, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";

interface OrderItem {
  id: string;
  itemType: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceMinor: string;
  lineTotalMinor: string;
  sellerTenantId: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  grandTotalMinor: string;
  currency: string;
  collectorParty: string;
  openedAt: string;
  completedAt?: string;
  items: OrderItem[];
}

export default function ProfessionalOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/orders");
      if (!res.ok) throw new Error(`Failed to load orders: ${res.statusText}`);
      const json = await res.json();
      setOrders(json.data?.orders || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar órdenes de venta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSalesMinor = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((acc, curr) => acc + BigInt(curr.grandTotalMinor), 0n);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Mis Ventas & Tickets
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide">
            Historial de tickets, servicios cobrados y ventas de productos de tu cuenta independiente.
          </p>
        </div>
        <div className="flex gap-4">
          <PremiumButton onClick={loadOrders} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Ventas Totales Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-primary">
              ${(Number(totalSalesMinor) / 100).toLocaleString("es-CO")} COP
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground/5 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-headline tracking-widest text-muted-foreground">
              Total Órdenes Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline tracking-wider text-foreground">
              {orders.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por número de orden..."
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
            <Receipt className="w-4 h-4 text-primary" />
            Tickets de Venta ({filtered.length} órdenes)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-foreground/5">
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Número</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Fecha</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Total</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Modalidad Cobro</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase">Estado</th>
                  <th className="p-4 text-xs font-headline tracking-widest text-foreground/40 uppercase text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-light">
                      Consultando órdenes en PostgreSQL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-light">
                      No hay tickets registrados en tu cuenta independiente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-sm text-foreground">
                        {o.orderNumber}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground font-light">
                        {new Date(o.openedAt).toLocaleString("es-CO")}
                      </td>
                      <td className="p-4 font-headline tracking-wider text-foreground">
                        ${(Number(o.grandTotalMinor) / 100).toLocaleString("es-CO")} COP
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">
                        {o.collectorParty}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-widest font-headline ${
                            o.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : o.status === "REFUNDED"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 hover:bg-foreground/10 rounded-lg text-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-headline text-lg tracking-wide uppercase">
                  Ticket {selectedOrder.orderNumber}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedOrder.openedAt).toLocaleString("es-CO")}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Cerrar
              </button>
            </div>

            <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
              {selectedOrder.items?.map((item) => (
                <div key={item.id} className="py-2 flex justify-between text-sm">
                  <div>
                    <div className="font-headline text-foreground">{item.nameSnapshot}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} x ${(Number(item.unitPriceMinor) / 100).toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div className="font-headline text-foreground">
                    ${(Number(item.lineTotalMinor) / 100).toLocaleString("es-CO")}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-headline text-sm uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="font-headline text-xl text-primary">
                ${(Number(selectedOrder.grandTotalMinor) / 100).toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
