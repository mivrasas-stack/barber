"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  User,
  Calendar,
} from "lucide-react";

interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  grandTotalMinor: number;
  status: "COMPLETED" | "DRAFT" | "CANCELLED";
  itemsCount: number;
  openedAt: string;
  tenders: string[];
}

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [orders] = useState<OrderSummary[]>([
    {
      id: "ord-1",
      orderNumber: "ORD-MUYMQ9Z1-102",
      customerName: "Mateo Carvajal",
      grandTotalMinor: 8000000,
      status: "COMPLETED",
      itemsCount: 2,
      openedAt: "Hoy, 15:30",
      tenders: ["CASH"],
    },
    {
      id: "ord-2",
      orderNumber: "ORD-MUYMQ8B4-904",
      customerName: "Sebastián Yatra",
      grandTotalMinor: 4500000,
      status: "COMPLETED",
      itemsCount: 1,
      openedAt: "Hoy, 14:15",
      tenders: ["EXTERNAL_CARD"],
    },
    {
      id: "ord-3",
      orderNumber: "ORD-MUYMP7A2-301",
      customerName: "Juanes Gómez",
      grandTotalMinor: 11000000,
      status: "COMPLETED",
      itemsCount: 3,
      openedAt: "Hoy, 11:45",
      tenders: ["NEQUI"],
    },
    {
      id: "ord-4",
      orderNumber: "ORD-MUYMO6X9-550",
      customerName: "Carlos Vives",
      grandTotalMinor: 3500000,
      status: "CANCELLED",
      itemsCount: 1,
      openedAt: "Ayer, 18:20",
      tenders: [],
    },
  ]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-headline tracking-widest text-foreground uppercase flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" /> Historial de Órdenes y Ventas
          </h1>
          <p className="text-muted-foreground text-sm font-light mt-1">
            Registro transaccional de ventas, tickets emitidos y cobros por punto de venta.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <Input
            placeholder="Buscar por # de orden o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-foreground/5 border-border h-10 text-xs"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "COMPLETED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-foreground/5 hover:bg-foreground/10 text-foreground"
              }`}
            >
              {st === "ALL" ? "Todas" : st === "COMPLETED" ? "Completadas" : "Canceladas"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="py-4 border-b border-border bg-white/[0.01]">
          <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Tickets Registrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-foreground/5 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="p-3"># Orden</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Medio de Pago</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron órdenes registradas.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border hover:bg-foreground/5 transition"
                    >
                      <td className="p-3 font-mono font-medium text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="p-3 text-foreground font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {order.customerName}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {order.itemsCount} {order.itemsCount === 1 ? "ítem" : "ítems"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {order.tenders.join(", ") || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {order.openedAt}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            order.status === "COMPLETED"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {order.status === "COMPLETED" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Completada
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Cancelada
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ${(order.grandTotalMinor / 100).toLocaleString("es-CO")}
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
