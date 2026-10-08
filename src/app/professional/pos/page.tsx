"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Package,
  Receipt,
  Scissors,
} from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  priceMinor: number;
  stock?: number;
  sku?: string;
}

interface CartItem extends CatalogItem {
  quantity: number;
}

export default function ProfessionalPOSPage() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<"CASH" | "EXTERNAL_CARD" | "NEQUI" | "WOMPI_ONLINE">("NEQUI");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [catalog] = useState<CatalogItem[]>([
    {
      id: "pro-srv-1",
      name: "Corte y Perfilado de Barba Signature",
      type: "SERVICE",
      priceMinor: 6000000,
    },
    {
      id: "pro-srv-2",
      name: "Diseño y Ritual de Barba con Toalla Caliente",
      type: "SERVICE",
      priceMinor: 4000000,
    },
    {
      id: "pro-prod-1",
      name: "Cera Mate Carlos Signature 80g",
      type: "PRODUCT",
      priceMinor: 4000000,
      stock: 10,
      sku: "WAX-CARLOS-80",
    },
  ]);

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        if (item.type === "PRODUCT" && item.stock && existing.quantity >= item.stock) {
          alert(`Stock insuficiente para ${item.name}`);
          return prev;
        }
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (item.type === "PRODUCT" && item.stock && newQty > item.stock) {
              alert(`Stock insuficiente para ${item.name}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
  };

  const subtotalMinor = cart.reduce(
    (acc, item) => acc + item.priceMinor * item.quantity,
    0
  );
  const grandTotalMinor = subtotalMinor;

  const filteredCatalog = catalog.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const received = amountReceived ? Number(amountReceived) * 100 : grandTotalMinor;
    const change = received > grandTotalMinor ? received - grandTotalMinor : 0;

    setTimeout(() => {
      setIsSubmitting(false);
      setCompletedReceipt({
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        items: [...cart],
        grandTotalMinor,
        tenderMethod,
        amountReceivedMinor: received,
        changeDueMinor: change,
        customerName: customerName || "Cliente Privado",
        completedAt: new Date(),
      });
      setIsCheckingOut(false);
      clearCart();
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-headline tracking-widest text-foreground uppercase flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" /> Mi Punto de Venta (Solo)
          </h1>
          <p className="text-muted-foreground text-sm font-light mt-1">
            Cobro directo de tus servicios y productos de autor con liquidación en tu propio libro mayor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              placeholder="Buscar en mi catálogo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-foreground/5 border-border h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredCatalog.map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-card hover:bg-foreground/5 border border-border hover:border-primary/50 transition rounded-xl p-4 cursor-pointer flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        item.type === "SERVICE"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {item.type === "SERVICE" ? "Mi Servicio" : "Mi Producto"}
                    </span>
                    {item.type === "PRODUCT" && (
                      <span className="text-[11px] text-muted-foreground">
                        Stock: <span className="font-semibold text-foreground">{item.stock}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition line-clamp-2">
                    {item.name}
                  </h3>
                </div>
                <div className="mt-4 pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-base font-bold text-foreground font-mono">
                    ${(item.priceMinor / 100).toLocaleString("es-CO")}
                  </span>
                  <button className="w-7 h-7 rounded-full bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="border-border bg-card shadow-lg sticky top-6">
            <CardHeader className="border-b border-border py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Mi Ticket
                </CardTitle>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-muted-foreground hover:text-red-400 transition"
                  >
                    Vaciar
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Cliente
                </label>
                <Input
                  placeholder="Nombre del cliente..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-foreground/5 border-border h-9 text-xs"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs font-light">
                    Agrega servicios o productos para cobrar.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-foreground/5 border border-border text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-foreground truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ${(item.priceMinor / 100).toLocaleString("es-CO")} c/u
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-border rounded-md bg-card">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-foreground/10 text-muted-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-foreground/10 text-muted-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-bold w-16 text-right">
                          ${((item.priceMinor * item.quantity) / 100).toLocaleString("es-CO")}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2 text-xs">
                  <div className="flex justify-between text-base font-bold text-foreground">
                    <span>Total a Cobrar</span>
                    <span className="font-mono text-primary">
                      ${(grandTotalMinor / 100).toLocaleString("es-CO")}
                    </span>
                  </div>

                  <PremiumButton
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full mt-3 h-11 flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <CreditCard className="w-4 h-4" /> Cobrar Ticket
                  </PremiumButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-headline tracking-widest text-lg uppercase text-foreground">
                Cobro Directo
              </h3>
              <button
                onClick={() => setIsCheckingOut(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center py-2 bg-foreground/5 rounded-xl border border-border">
                <span className="text-xs text-muted-foreground block uppercase tracking-wider">
                  Total
                </span>
                <span className="text-3xl font-mono font-bold text-primary">
                  ${(grandTotalMinor / 100).toLocaleString("es-CO")} COP
                </span>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">
                  Medio de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTenderMethod("NEQUI")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      tenderMethod === "NEQUI"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Nequi
                  </button>
                  <button
                    onClick={() => setTenderMethod("CASH")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      tenderMethod === "CASH"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> Efectivo
                  </button>
                  <button
                    onClick={() => setTenderMethod("EXTERNAL_CARD")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      tenderMethod === "EXTERNAL_CARD"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Datafono
                  </button>
                  <button
                    onClick={() => setTenderMethod("WOMPI_ONLINE")}
                    className={`col-span-3 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      tenderMethod === "WOMPI_ONLINE"
                        ? "border-amber-500 bg-amber-500/10 text-amber-500"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Cobro en Línea (Wompi / PSE)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsCheckingOut(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-foreground/5"
              >
                Cancelar
              </button>
              <PremiumButton
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Procesando..." : "Confirmar Cobro"}
              </PremiumButton>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto border border-green-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-headline tracking-widest text-lg uppercase text-foreground">
                Cobro Exitoso
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {completedReceipt.orderNumber}
              </p>
            </div>

            <div className="bg-foreground/5 border border-border rounded-xl p-3 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Cliente:</span>
                <span className="text-foreground">{completedReceipt.customerName}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Método:</span>
                <span className="text-foreground">{completedReceipt.tenderMethod}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                <span>Total:</span>
                <span className="text-primary">
                  ${(completedReceipt.grandTotalMinor / 100).toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            <PremiumButton
              onClick={() => setCompletedReceipt(null)}
              className="w-full py-2.5 text-xs font-semibold"
            >
              Aceptar
            </PremiumButton>
          </div>
        </div>
      )}
    </div>
  );
}
