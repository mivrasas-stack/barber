"use client";

import React, { useState, useEffect } from "react";
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
  Scissors,
  Package,
  User,
  AlertCircle,
  Receipt,
} from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  priceMinor: number;
  sellerName?: string;
  stock?: number;
  sku?: string;
  variantId?: string;
}

interface CartItem extends CatalogItem {
  quantity: number;
}

export default function BarberPOSPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "SERVICES" | "PRODUCTS">("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<"CASH" | "EXTERNAL_CARD" | "NEQUI" | "BANK_TRANSFER">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available catalog items (sample fallback + real items)
  const [catalog, setCatalog] = useState<CatalogItem[]>([
    {
      id: "srv-corte-clasico",
      name: "Corte Clásico Imperial",
      type: "SERVICE",
      priceMinor: 4500000,
      sellerName: "The Royal Barber",
    },
    {
      id: "srv-barba-toalla",
      name: "Afeitado con Toalla Caliente",
      type: "SERVICE",
      priceMinor: 3500000,
      sellerName: "The Royal Barber",
    },
    {
      id: "srv-carlos-signature",
      name: "Corte y Perfilado de Barba",
      type: "SERVICE",
      priceMinor: 6000000,
      sellerName: "Carlos Mendoza (Solo)",
    },
    {
      id: "prod-pomada-100",
      name: "Pomada Clásica Base Agua 100g",
      type: "PRODUCT",
      priceMinor: 4500000,
      sellerName: "The Royal Barber",
      stock: 18,
      sku: "POM-ROYAL-100",
    },
    {
      id: "prod-aceite-barba",
      name: "Aceite Para Barba Bergamota 30ml",
      type: "PRODUCT",
      priceMinor: 3500000,
      sellerName: "The Royal Barber",
      stock: 12,
      sku: "OIL-ROYAL-30",
    },
    {
      id: "prod-cera-carlos",
      name: "Cera Mate Carlos Signature 80g",
      type: "PRODUCT",
      priceMinor: 4000000,
      sellerName: "Carlos Mendoza Grooming",
      stock: 9,
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
    setErrorMessage(null);
  };

  const subtotalMinor = cart.reduce(
    (acc, item) => acc + item.priceMinor * item.quantity,
    0
  );
  const grandTotalMinor = subtotalMinor;

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" ||
      (categoryFilter === "SERVICES" && item.type === "SERVICE") ||
      (categoryFilter === "PRODUCTS" && item.type === "PRODUCT");
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const received = amountReceived ? Number(amountReceived) * 100 : grandTotalMinor;
    const change = received > grandTotalMinor ? received - grandTotalMinor : 0;

    // Simulate / execute POS transaction
    setTimeout(() => {
      setIsSubmitting(false);
      setCompletedReceipt({
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        items: [...cart],
        grandTotalMinor,
        tenderMethod,
        amountReceivedMinor: received,
        changeDueMinor: change,
        customerName: customerName || "Consumidor Final",
        completedAt: new Date(),
      });
      setIsCheckingOut(false);
      clearCart();
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-headline tracking-widest text-foreground uppercase flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" /> Punto de Venta (POS)
          </h1>
          <p className="text-muted-foreground text-sm font-light mt-1">
            Terminal transaccional multisede y multisede de cobro con inventario en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-full text-xs font-semibold">
            Sede: The Royal Barber - Zona G
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Catalog Selector (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <Input
                placeholder="Buscar servicio o producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-foreground/5 border-border h-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === "ALL"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-foreground/5 hover:bg-foreground/10 text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setCategoryFilter("SERVICES")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === "SERVICES"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-foreground/5 hover:bg-foreground/10 text-foreground"
                }`}
              >
                Servicios
              </button>
              <button
                onClick={() => setCategoryFilter("PRODUCTS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === "PRODUCTS"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-foreground/5 hover:bg-foreground/10 text-foreground"
                }`}
              >
                Productos
              </button>
            </div>
          </div>

          {/* Catalog Grid */}
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
                      {item.type === "SERVICE" ? "Servicio" : "Producto"}
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
                  {item.sellerName && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {item.sellerName}
                    </p>
                  )}
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

        {/* Right Side: Cart & Checkout (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="border-border bg-card shadow-lg sticky top-6">
            <CardHeader className="border-b border-border py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Ticket de Venta
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
              {/* Customer input */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Cliente (Opcional)
                </label>
                <Input
                  placeholder="Nombre o teléfono del cliente..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-foreground/5 border-border h-9 text-xs"
                />
              </div>

              {/* Cart Line Items */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs font-light">
                    El ticket está vacío. Agrega servicios o productos desde el catálogo.
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
                          {item.sellerName && ` • ${item.sellerName}`}
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

              {/* Totals Section */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      ${(subtotalMinor / 100).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>Total a Pagar</span>
                    <span className="font-mono text-primary">
                      ${(grandTotalMinor / 100).toLocaleString("es-CO")}
                    </span>
                  </div>

                  <PremiumButton
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full mt-3 h-11 flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <CreditCard className="w-4 h-4" /> Proceder al Cobro
                  </PremiumButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Payment Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-headline tracking-widest text-lg uppercase text-foreground">
                Cobro de Ticket
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
                  Total Liquidado
                </span>
                <span className="text-3xl font-mono font-bold text-primary">
                  ${(grandTotalMinor / 100).toLocaleString("es-CO")} COP
                </span>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTenderMethod("CASH")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                      tenderMethod === "CASH"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> Efectivo
                  </button>
                  <button
                    onClick={() => setTenderMethod("EXTERNAL_CARD")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                      tenderMethod === "EXTERNAL_CARD"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Datafono / Tarjeta
                  </button>
                  <button
                    onClick={() => setTenderMethod("NEQUI")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                      tenderMethod === "NEQUI"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Nequi / Daviplata
                  </button>
                  <button
                    onClick={() => setTenderMethod("BANK_TRANSFER")}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                      tenderMethod === "BANK_TRANSFER"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground"
                    }`}
                  >
                    <Package className="w-4 h-4" /> Transferencia
                  </button>
                </div>
              </div>

              {tenderMethod === "CASH" && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">
                    Monto Recibido en Efectivo
                  </label>
                  <Input
                    type="number"
                    placeholder={(grandTotalMinor / 100).toString()}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="bg-foreground/5 border-border h-10 font-mono text-base"
                  />
                  {amountReceived && Number(amountReceived) * 100 >= grandTotalMinor && (
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex justify-between">
                      <span>Cambio a Entregar:</span>
                      <span className="font-mono font-bold">
                        ${(Number(amountReceived) - grandTotalMinor / 100).toLocaleString("es-CO")}
                      </span>
                    </div>
                  )}
                </div>
              )}
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
                {isSubmitting ? "Procesando..." : "Confirmar y Cobrar"}
              </PremiumButton>
            </div>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto border border-green-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-headline tracking-widest text-lg uppercase text-foreground">
                Venta Completada
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
                <span>Total Cobrado:</span>
                <span className="text-primary">
                  ${(completedReceipt.grandTotalMinor / 100).toLocaleString("es-CO")}
                </span>
              </div>
              {completedReceipt.changeDueMinor > 0 && (
                <div className="flex justify-between text-green-400 font-semibold">
                  <span>Cambio devuelto:</span>
                  <span>${(completedReceipt.changeDueMinor / 100).toLocaleString("es-CO")}</span>
                </div>
              )}
            </div>

            <PremiumButton
              onClick={() => setCompletedReceipt(null)}
              className="w-full py-2.5 text-xs font-semibold"
            >
              Cerrar y Nueva Venta
            </PremiumButton>
          </div>
        </div>
      )}
    </div>
  );
}
