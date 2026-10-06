"use client";
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  dummyWaitingRoomOrders, 
  dummyWaitingRoomProducts,
  type WaitingRoomProduct 
} from "@/app/clientes/data";
import { 
  Coffee, CheckCircle2, XCircle, Search, Package, 
  Plus, Minus, Trash2, Edit2, AlertTriangle, Layers, 
  Filter, Sparkles, Scissors, Sparkle
} from "lucide-react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface BeautyProduct {
  id: string;
  name: string;
  category: 'Mascarillas' | 'Geles & Peinado' | 'Cremas & Afeitado' | 'Ceras & Pomadas' | 'Tratamientos' | 'Cuidado de Barba';
  price: number;
  stock: number;
  stockMin: number;
  brand?: string;
}

const INITIAL_BEAUTY_PRODUCTS: BeautyProduct[] = [
  { id: 'BEAUTY-001', name: 'Mascarilla Negra Purificante (Puntos Negros)', category: 'Mascarillas', price: 15000, stock: 24, stockMin: 5, brand: 'Barber Care Pro' },
  { id: 'BEAUTY-002', name: 'Gel Fijador Extra Forte 500g', category: 'Geles & Peinado', price: 18000, stock: 35, stockMin: 10, brand: 'Gorilla Barber' },
  { id: 'BEAUTY-003', name: 'Crema de Afeitar Hidratante Menthol', category: 'Cremas & Afeitado', price: 22000, stock: 14, stockMin: 5, brand: 'Elegance Shave' },
  { id: 'BEAUTY-004', name: 'Cera Mate Efecto Natural 100g', category: 'Ceras & Pomadas', price: 25000, stock: 30, stockMin: 8, brand: 'Suavecito Barber' },
  { id: 'BEAUTY-005', name: 'Aceite Hidratante para Barba & Bigote', category: 'Cuidado de Barba', price: 30000, stock: 12, stockMin: 4, brand: 'Beard Lord' },
  { id: 'BEAUTY-006', name: 'Tónico Capilar Anticaída & Crecimiento', category: 'Tratamientos', price: 35000, stock: 8, stockMin: 3, brand: 'Minox Barber' },
  { id: 'BEAUTY-007', name: 'Exfoliante Facial de Carbón Activado', category: 'Mascarillas', price: 20000, stock: 18, stockMin: 5, brand: 'Barber Care Pro' },
  { id: 'BEAUTY-008', name: 'Bálsamo Calmante Post-Afeitado', category: 'Cremas & Afeitado', price: 24000, stock: 22, stockMin: 6, brand: 'Nivea Men Pro' },
];

export default function BarberWaitRoom() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'beauty'>('orders');
  
  // Productos de consumibles (bebidas/snacks)
  const [products, setProducts] = useState<WaitingRoomProduct[]>(dummyWaitingRoomProducts);
  const [orders, setOrders] = useState(dummyWaitingRoomOrders);

  // Productos de Belleza & Cuidado
  const [beautyProducts, setBeautyProducts] = useState<BeautyProduct[]>(INITIAL_BEAUTY_PRODUCTS);

  // Filtros
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [beautySearch, setBeautySearch] = useState('');
  const [selectedBeautyCategory, setSelectedBeautyCategory] = useState<string>('all');

  // Modales para añadir
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddBeautyDialogOpen, setIsAddBeautyDialogOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Bebidas',
    price: '',
    stock: '',
    stockMin: '5',
  });

  const [newBeautyProduct, setNewBeautyProduct] = useState({
    name: '',
    category: 'Mascarillas' as BeautyProduct['category'],
    brand: '',
    price: '',
    stock: '',
    stockMin: '5',
  });

  // Notificación
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const pendingOrders = orders.filter(o => o.status === 'Pendiente');

  // Filtros de consumibles
  const categories = Array.from(new Set(products.map(p => p.category)));
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtros de belleza
  const beautyCategories = Array.from(new Set(beautyProducts.map(p => p.category)));
  const filteredBeautyProducts = beautyProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(beautySearch.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(beautySearch.toLowerCase()));
    const matchesCategory = selectedBeautyCategory === 'all' || p.category === selectedBeautyCategory;
    return matchesSearch && matchesCategory;
  });

  // Acciones stock consumibles
  const handleStockChange = (id: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newStock = Math.max(0, p.stock + delta);
        return { ...p, stock: newStock };
      }
      return p;
    }));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showNotification('Producto de consumibles eliminado.');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.stock) return;

    const created: WaitingRoomProduct = {
      id: `WR${Date.now().toString().slice(-4)}`,
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock, 10),
      stockMin: parseInt(newProduct.stockMin || '5', 10),
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(newProduct.name)}/300/300`,
    };

    setProducts(prev => [created, ...prev]);
    setIsAddProductDialogOpen(false);
    setNewProduct({ name: '', category: 'Bebidas', price: '', stock: '', stockMin: '5' });
    showNotification(`Producto "${created.name}" añadido exitosamente.`);
  };

  // Acciones stock productos de belleza
  const handleBeautyStockChange = (id: string, delta: number) => {
    setBeautyProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newStock = Math.max(0, p.stock + delta);
        return { ...p, stock: newStock };
      }
      return p;
    }));
  };

  const handleDeleteBeautyProduct = (id: string) => {
    setBeautyProducts(prev => prev.filter(p => p.id !== id));
    showNotification('Producto de belleza eliminado.');
  };

  const handleAddBeautyProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeautyProduct.name || !newBeautyProduct.price || !newBeautyProduct.stock) return;

    const created: BeautyProduct = {
      id: `BEAUTY-${Date.now().toString().slice(-4)}`,
      name: newBeautyProduct.name,
      category: newBeautyProduct.category,
      brand: newBeautyProduct.brand || 'Barber Care',
      price: parseFloat(newBeautyProduct.price),
      stock: parseInt(newBeautyProduct.stock, 10),
      stockMin: parseInt(newBeautyProduct.stockMin || '5', 10),
    };

    setBeautyProducts(prev => [created, ...prev]);
    setIsAddBeautyDialogOpen(false);
    setNewBeautyProduct({ name: '', category: 'Mascarillas', brand: '', price: '', stock: '', stockMin: '5' });
    showNotification(`Producto de belleza "${created.name}" añadido exitosamente.`);
  };

  const handleUpdateOrderStatus = (orderId: string, status: 'Entregado' | 'Cancelado') => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    showNotification(`Pedido ${status === 'Entregado' ? 'marcado como entregado' : 'cancelado'}.`);
  };

  // Estadísticas
  const totalProducts = products.length;
  const totalStockCount = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock <= p.stockMin).length;

  const totalBeautyProducts = beautyProducts.length;
  const totalBeautyStockCount = beautyProducts.reduce((acc, p) => acc + p.stock, 0);
  const lowBeautyStockCount = beautyProducts.filter(p => p.stock <= p.stockMin).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      
      {/* Notificación Flotante */}
      {notification && (
        <div className="fixed top-8 right-8 z-50 px-6 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-headline tracking-widest uppercase">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-500 font-headline tracking-[0.2em] uppercase text-xs sm:text-sm">Sala de Espera & Productos</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline text-foreground tracking-widest uppercase">
            Lounge VIP & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">Catálogo</span>
          </h1>
          <p className="text-muted-foreground font-light mt-2 tracking-wide text-sm md:text-base">
            Gestión de pedidos de la sala de espera, insumos de bebidas e inventario de cosméticos y belleza.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'beauty' ? (
            <PremiumButton 
              onClick={() => setIsAddBeautyDialogOpen(true)}
              className="flex items-center gap-2 text-xs font-headline uppercase tracking-widest h-12 px-6 bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600"
            >
              <Sparkles className="w-4 h-4" />
              Añadir Producto de Belleza
            </PremiumButton>
          ) : (
            <PremiumButton 
              onClick={() => setIsAddProductDialogOpen(true)}
              className="flex items-center gap-2 text-xs font-headline uppercase tracking-widest h-12 px-6"
            >
              <Plus className="w-4 h-4" />
              Añadir Bebida / Snack
            </PremiumButton>
          )}
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-card border border-border w-fit shadow-lg flex-wrap">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2.5 ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Coffee className="w-4 h-4" />
          Pedidos Lounge ({pendingOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2.5 ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          Snacks & Bebidas ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('beauty')}
          className={`px-5 py-3 rounded-xl text-xs font-headline tracking-widest uppercase transition-all flex items-center gap-2.5 ${
            activeTab === 'beauty'
              ? 'bg-gradient-to-r from-purple-600 to-amber-500 text-white font-bold shadow-lg shadow-purple-500/20'
              : 'text-foreground/50 hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Productos de Belleza & Cuidado ({beautyProducts.length})
        </button>
      </div>

      {/* PESTAÑA 1: PEDIDOS LOUNGE & MENÚ RÁPIDO */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Orders Queue */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-foreground/5 border-border">
              <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  Fila de Preparación ({pendingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="border border-border bg-foreground/5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 group hover:border-amber-500/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-headline text-xl text-foreground">{order.customerName}</h4>
                          <span className="text-[10px] font-headline tracking-widest text-amber-500 uppercase border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            Cód: {order.code}
                          </span>
                        </div>
                        <p className="text-sm font-light text-foreground/60">
                          {order.items ? order.items.map(item => `${item.quantity}x ${item.name}`).join(', ') : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'Cancelado')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors rounded-lg text-xs font-headline tracking-widest uppercase"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'Entregado')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 transition-colors rounded-lg text-xs font-headline tracking-widest uppercase font-bold"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Entregado
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingOrders.length === 0 && (
                    <div className="text-center py-12 text-foreground/40 font-light">
                      <Coffee className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-headline uppercase tracking-widest text-sm">No hay pedidos pendientes en este momento.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Inventory / Menu */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-foreground/5 border-border">
              <CardHeader className="border-b border-border pb-4 bg-white/[0.01]">
                <CardTitle className="text-sm font-light tracking-widest text-muted-foreground uppercase flex items-center justify-between">
                  <span>Menú Disponible</span>
                  <span className="text-xs text-amber-500 font-mono font-normal">{products.length} productos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {products.map(prod => (
                    <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors">
                      <div>
                        <p className="font-headline tracking-wide text-foreground">{prod.name}</p>
                        <p className="text-[10px] tracking-widest text-foreground/40 uppercase">
                          Stock: <span className={prod.stock <= prod.stockMin ? 'text-rose-400 font-bold' : 'text-foreground/80'}>{prod.stock}</span>
                        </p>
                      </div>
                      <p className="font-light text-amber-500 text-sm font-mono">COP {prod.price.toLocaleString('es-CO')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: INVENTARIO DE SNACKS & BEBIDAS */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Total Consumibles</span>
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-3xl font-headline text-foreground mt-2 font-mono">{totalProducts}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Bebidas y snacks en el menú VIP</p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Unidades Totales</span>
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-headline text-emerald-400 mt-2 font-mono">{totalStockCount}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Stock físico disponible</p>
            </div>

            <div className={`p-6 rounded-3xl bg-card border shadow-xl backdrop-blur-xl ${lowStockCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-rose-400">Stock Bajo</span>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-3xl font-headline text-rose-400 mt-2 font-mono">{lowStockCount}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Cerca o debajo del stock mínimo</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
              <Input
                placeholder="Buscar bebida o snack..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                className="pl-11 bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 whitespace-nowrap flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" /> Categoría:
              </span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-headline uppercase w-full sm:w-48">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-xl">
                  <SelectItem value="all">Todas las Categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-foreground/5 border-b border-border text-[10px] uppercase tracking-widest text-foreground/40 font-headline">
                    <th className="p-4 sm:p-5">Producto</th>
                    <th className="p-4 sm:p-5">Categoría</th>
                    <th className="p-4 sm:p-5">Precio (COP)</th>
                    <th className="p-4 sm:p-5 text-center">Control de Stock</th>
                    <th className="p-4 sm:p-5">Estado</th>
                    <th className="p-4 sm:p-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-light">
                  {filteredProducts.map(prod => {
                    const isLowStock = prod.stock <= prod.stockMin;
                    const isOutStock = prod.stock === 0;

                    return (
                      <tr key={prod.id} className="hover:bg-foreground/5 transition-colors group">
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="font-headline tracking-wide text-foreground text-sm group-hover:text-amber-300 transition-colors">{prod.name}</p>
                              <p className="text-[10px] text-foreground/40 font-mono">ID: {prod.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 sm:p-5">
                          <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-foreground/5 border border-border">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-4 sm:p-5 font-mono font-bold text-sm text-foreground">
                          ${prod.price.toLocaleString('es-CO')}
                        </td>

                        <td className="p-4 sm:p-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStockChange(prod.id, -1)}
                              className="w-8 h-8 rounded-lg border border-border bg-foreground/5 hover:bg-rose-500/20 hover:border-rose-500/40 text-foreground flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-12 text-center font-mono font-bold text-sm text-foreground">
                              {prod.stock}
                            </span>
                            <button
                              onClick={() => handleStockChange(prod.id, 1)}
                              className="w-8 h-8 rounded-lg border border-border bg-foreground/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-foreground flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="p-4 sm:p-5">
                          {isOutStock ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Óptimo
                            </span>
                          )}
                        </td>

                        <td className="p-4 sm:p-5 text-right">
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-2 rounded-lg border border-border hover:border-rose-500/40 hover:bg-rose-500/10 text-foreground/40 hover:text-rose-400 transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PRODUCTOS DE BELLEZA & CUIDADO (MASCARILLAS, GELES, CREMAS, CERAS) */}
      {activeTab === 'beauty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-card border border-purple-500/30 shadow-xl backdrop-blur-xl bg-purple-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-purple-300">Cosméticos & Belleza</span>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-3xl font-headline text-purple-200 mt-2 font-mono">{totalBeautyProducts}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Mascarillas, geles, cremas y ceras</p>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40">Unidades Físicas</span>
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-headline text-emerald-400 mt-2 font-mono">{totalBeautyStockCount}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Stock disponible en gabinetes</p>
            </div>

            <div className={`p-6 rounded-3xl bg-card border shadow-xl backdrop-blur-xl ${lowBeautyStockCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-headline tracking-widest uppercase text-rose-400">Reabastecimiento Necesario</span>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-3xl font-headline text-rose-400 mt-2 font-mono">{lowBeautyStockCount}</h3>
              <p className="text-xs text-foreground/40 mt-1 font-light">Insumos de belleza en stock crítico</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
              <Input
                placeholder="Buscar mascarilla, gel, cera, marca..."
                value={beautySearch}
                onChange={e => setBeautySearch(e.target.value)}
                className="pl-11 bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-[10px] font-headline tracking-widest uppercase text-foreground/40 whitespace-nowrap flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-purple-400" /> Tipo de Producto:
              </span>
              <Select value={selectedBeautyCategory} onValueChange={setSelectedBeautyCategory}>
                <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-headline uppercase w-full sm:w-52">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-xl">
                  <SelectItem value="all">Todas las Categorías</SelectItem>
                  {beautyCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-foreground/5 border-b border-border text-[10px] uppercase tracking-widest text-foreground/40 font-headline">
                    <th className="p-4 sm:p-5">Producto de Belleza</th>
                    <th className="p-4 sm:p-5">Categoría</th>
                    <th className="p-4 sm:p-5">Marca / Proveedor</th>
                    <th className="p-4 sm:p-5">Precio Público</th>
                    <th className="p-4 sm:p-5 text-center">Control de Stock</th>
                    <th className="p-4 sm:p-5">Estado</th>
                    <th className="p-4 sm:p-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-light">
                  {filteredBeautyProducts.map(prod => {
                    const isLowStock = prod.stock <= prod.stockMin;
                    const isOutStock = prod.stock === 0;

                    return (
                      <tr key={prod.id} className="hover:bg-foreground/5 transition-colors group">
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="font-headline tracking-wide text-foreground text-sm group-hover:text-purple-300 transition-colors">{prod.name}</p>
                              <p className="text-[10px] text-foreground/40 font-mono">Ref: {prod.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 sm:p-5">
                          <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-4 sm:p-5 text-foreground/70 font-medium">
                          {prod.brand || 'Barber Care Pro'}
                        </td>

                        <td className="p-4 sm:p-5 font-mono font-bold text-sm text-foreground">
                          ${prod.price.toLocaleString('es-CO')}
                        </td>

                        <td className="p-4 sm:p-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleBeautyStockChange(prod.id, -1)}
                              className="w-8 h-8 rounded-lg border border-border bg-foreground/5 hover:bg-rose-500/20 hover:border-rose-500/40 text-foreground flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-12 text-center font-mono font-bold text-sm text-foreground">
                              {prod.stock}
                            </span>
                            <button
                              onClick={() => handleBeautyStockChange(prod.id, 1)}
                              className="w-8 h-8 rounded-lg border border-border bg-foreground/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-foreground flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="p-4 sm:p-5">
                          {isOutStock ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-headline uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Óptimo
                            </span>
                          )}
                        </td>

                        <td className="p-4 sm:p-5 text-right">
                          <button
                            onClick={() => handleDeleteBeautyProduct(prod.id)}
                            className="p-2 rounded-lg border border-border hover:border-rose-500/40 hover:bg-rose-500/10 text-foreground/40 hover:text-rose-400 transition-colors"
                            title="Eliminar producto de belleza"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBeautyProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-foreground/40 font-light">
                        No se encontraron productos de belleza registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialog para Añadir Producto de Consumibles */}
      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-foreground">
              Añadir Bebida o Snack
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/50 tracking-wide font-light">
              Ingresa los detalles de la bebida o snack para la sala de espera VIP.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Nombre del Producto *</label>
              <Input
                required
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Ej. Coca-Cola, Papas Fritas, Agua..."
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Categoría *</label>
              <Select
                value={newProduct.category}
                onValueChange={val => setNewProduct({ ...newProduct, category: val })}
              >
                <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-xl">
                  <SelectItem value="Bebidas">Bebidas (Gaseosas, Agua, Café)</SelectItem>
                  <SelectItem value="Golosinas">Golosinas & Snacks</SelectItem>
                  <SelectItem value="Licores">Licores & Cervezas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Precio ($ COP) *</label>
                <Input
                  required
                  type="number"
                  min="500"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="Ej. 3000"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Stock Inicial *</label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="Ej. 50"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddProductDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground/60 text-xs font-headline tracking-wider uppercase"
              >
                Cancelar
              </button>
              <PremiumButton type="submit" className="px-6 py-2">
                <span className="text-xs uppercase tracking-widest font-headline">Guardar Producto</span>
              </PremiumButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal / Dialog para Añadir Producto de Belleza */}
      <Dialog open={isAddBeautyDialogOpen} onOpenChange={setIsAddBeautyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline tracking-widest uppercase text-foreground">
              Añadir Producto de Belleza
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground/50 tracking-wide font-light">
              Registra un nuevo cosmético o insumo de belleza (Mascarillas, Geles, Cremas, Ceras, Tratamientos).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBeautyProduct} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Nombre del Producto *</label>
              <Input
                required
                value={newBeautyProduct.name}
                onChange={e => setNewBeautyProduct({ ...newBeautyProduct, name: e.target.value })}
                placeholder="Ej. Mascarilla Negra, Gel Fijador, Crema de Afeitar..."
                className="bg-foreground/5 border-border rounded-xl h-11 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Tipo de Cosmético *</label>
                <Select
                  value={newBeautyProduct.category}
                  onValueChange={(val: BeautyProduct['category']) => setNewBeautyProduct({ ...newBeautyProduct, category: val })}
                >
                  <SelectTrigger className="bg-foreground/5 border-border rounded-xl h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-xl">
                    <SelectItem value="Mascarillas">Mascarillas & Faciales</SelectItem>
                    <SelectItem value="Geles & Peinado">Geles & Peinado</SelectItem>
                    <SelectItem value="Cremas & Afeitado">Cremas & Afeitado</SelectItem>
                    <SelectItem value="Ceras & Pomadas">Ceras & Pomadas</SelectItem>
                    <SelectItem value="Cuidado de Barba">Cuidado de Barba</SelectItem>
                    <SelectItem value="Tratamientos">Tratamientos Capilares</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Marca / Proveedor</label>
                <Input
                  value={newBeautyProduct.brand}
                  onChange={e => setNewBeautyProduct({ ...newBeautyProduct, brand: e.target.value })}
                  placeholder="Ej. Barber Care Pro"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Precio Público ($ COP) *</label>
                <Input
                  required
                  type="number"
                  min="1000"
                  value={newBeautyProduct.price}
                  onChange={e => setNewBeautyProduct({ ...newBeautyProduct, price: e.target.value })}
                  placeholder="Ej. 25000"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-headline tracking-widest uppercase text-foreground/60">Stock Inicial *</label>
                <Input
                  required
                  type="number"
                  min="1"
                  value={newBeautyProduct.stock}
                  onChange={e => setNewBeautyProduct({ ...newBeautyProduct, stock: e.target.value })}
                  placeholder="Ej. 20"
                  className="bg-foreground/5 border-border rounded-xl h-11 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddBeautyDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground/60 text-xs font-headline tracking-wider uppercase"
              >
                Cancelar
              </button>
              <PremiumButton type="submit" className="px-6 py-2 bg-gradient-to-r from-purple-500 to-amber-500">
                <span className="text-xs uppercase tracking-widest font-headline">Guardar Producto</span>
              </PremiumButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
