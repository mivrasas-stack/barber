"use client";
import React, { useState, useMemo } from 'react';
import Image from "next/image";
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, File, CheckCircle2, Clock } from "lucide-react";
import { dummyWaitingRoomProducts, dummyWaitingRoomOrders } from "../data";
import type { WaitingRoomProduct, WaitingRoomOrder } from '@/lib/types';
import { AddWaitingRoomProductForm } from '@/components/dashboard/AddWaitingRoomProductForm';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { OrderDetailsDialog } from '@/components/dashboard/OrderDetailsDialog';
import { ManualOrderForm } from '@/components/dashboard/ManualOrderForm';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

export default function WaitingRoomPage() {
  const [products, setProducts] = useState<WaitingRoomProduct[]>(dummyWaitingRoomProducts);
  const [orders, setOrders] = useState<WaitingRoomOrder[]>(dummyWaitingRoomOrders);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isManualOrderFormOpen, setIsManualOrderFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WaitingRoomOrder | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleAddProduct = (newProduct: Omit<WaitingRoomProduct, 'id'>) => {
    const productWithId = { ...newProduct, id: `WR${products.length + 1}` };
    const updatedProducts = [...products, productWithId];
    setProducts(updatedProducts);
    dummyWaitingRoomProducts.push(productWithId);
    setIsFormOpen(false);
  };
  
  const handleVerifyCode = () => {
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Código Inválido",
        description: "El código de verificación debe tener 6 dígitos.",
      });
      return;
    }

    const orderIndex = orders.findIndex(order => order.code === verificationCode && order.status === 'Pendiente');

    if (orderIndex !== -1) {
      const updatedOrders = [...orders];
      updatedOrders[orderIndex].status = 'Confirmado';
      setOrders(updatedOrders);
      toast({
        title: "Pedido Confirmado",
        description: `El pedido de ${updatedOrders[orderIndex].customerName} ha sido confirmado.`,
      });
      setVerificationCode('');
    } else {
      toast({
        variant: "destructive",
        title: "Código no encontrado",
        description: "El código no corresponde a ningún pedido pendiente.",
      });
    }
  };

  const confirmOrder = (orderId: string) => {
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        const updatedOrders = [...orders];
        updatedOrders[orderIndex].status = 'Confirmado';
        setOrders(updatedOrders);
        toast({
            title: "Pedido Confirmado",
            description: `El pedido de ${updatedOrders[orderIndex].customerName} ha sido confirmado.`,
        });
    }
  }

  const deleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    toast({
        title: "Pedido Eliminado",
        description: "El pedido ha sido eliminado del historial.",
    });
  }
  
  const handleViewDetails = (order: WaitingRoomOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  }

  const handleAddManualOrder = (newOrderData: Omit<WaitingRoomOrder, 'id' | 'code' | 'status'>) => {
    const newOrder: WaitingRoomOrder = {
      ...newOrderData,
      id: `ORD${orders.length + 1}`,
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'Confirmado', 
    };
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    dummyWaitingRoomOrders.unshift(newOrder); 
    setIsManualOrderFormOpen(false);
    toast({
      title: "Pedido Manual Creado",
      description: `Se ha creado y confirmado el pedido para ${newOrder.customerName}.`
    });
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    return orders.filter(order => 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const handleExport = () => {
    const dataToExport = filteredOrders.map(order => ({
      'ID Pedido': order.id,
      'Cliente': order.customerName,
      'Código': order.code,
      'Total': order.total,
      'Método de Pago': order.paymentMethod,
      'Estado': order.status,
      'Artículos': order.items?.map(item => `${item.name} (x${item.quantity})`).join(', ') || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedidos");
    XLSX.writeFile(workbook, "pedidos_sala_espera.xlsx");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sala de Espera" />
      
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Monitor VIP</TabsTrigger>
          <TabsTrigger value="manage">Gestión Operativa</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0">
          <div className="bg-zinc-950 rounded-[2rem] p-8 md:p-12 relative overflow-hidden border border-border shadow-2xl">
            {/* Subtle animated background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950 to-zinc-950 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                  <h2 className="text-4xl md:text-5xl font-light tracking-tight text-foreground/90">
                    Lounge <span className="font-bold text-foreground">Monitor</span>
                  </h2>
                  <p className="text-zinc-500 mt-2 font-mono text-sm uppercase tracking-widest">
                    Live Status Updates
                  </p>
                </div>
                
                {/* Search input styled dark */}
                <div className="relative w-full md:w-auto min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    type="search"
                    placeholder="Buscar cliente o código..."
                    className="w-full bg-foreground/5 border-border text-foreground placeholder:text-zinc-500 pl-12 h-14 rounded-full focus-visible:ring-white/20 focus-visible:border-border text-lg transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
              >
                <AnimatePresence>
                  {filteredOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      layout
                      className="relative overflow-hidden rounded-3xl bg-foreground/5 border border-border backdrop-blur-3xl p-6 shadow-xl group hover:bg-foreground/10 transition-colors duration-500"
                    >
                      {/* Pulsing light indicator */}
                      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] ${order.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      
                      {/* Card Content */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-semibold text-foreground mb-1 tracking-tight truncate max-w-[180px]">
                            {order.customerName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-mono text-sm px-2 py-0.5 bg-black/40 rounded-md">
                              #{order.code}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`px-3 py-1.5 text-xs font-medium border rounded-full ${
                            order.status === 'Confirmado' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                          }`}
                        >
                          {order.status === 'Confirmado' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" /> : <Clock className="w-3.5 h-3.5 mr-1.5 inline animate-pulse" />}
                          {order.status}
                        </Badge>
                      </div>

                      <div className="space-y-4 mt-8 pt-6 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-sm font-medium">Total</span>
                          <span className="text-foreground font-medium text-lg tracking-tight">COP {order.total.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-sm font-medium">Método</span>
                          <span className="text-zinc-300 text-sm font-medium bg-foreground/5 px-2.5 py-1 rounded-lg">{order.paymentMethod}</span>
                        </div>
                      </div>

                      {/* Actions Dropdown */}
                      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-10 w-10 text-zinc-400 hover:text-foreground hover:bg-foreground/10 rounded-full backdrop-blur-md">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300 rounded-xl shadow-2xl">
                              <DropdownMenuLabel className="text-zinc-500">Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => confirmOrder(order.id)} disabled={order.status === 'Confirmado'} className="focus:bg-zinc-800 focus:text-foreground cursor-pointer">Marcar como Confirmado</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDetails(order)} className="focus:bg-zinc-800 focus:text-foreground cursor-pointer">Ver Detalles</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400 focus:bg-red-950 focus:text-red-300 cursor-pointer" onClick={() => deleteOrder(order.id)} disabled={order.status === 'Confirmado'}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                  {filteredOrders.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-zinc-500 text-lg">No hay pedidos que coincidan con la búsqueda.</p>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader>
                  <CardTitle>Verificar Código de Pago</CardTitle>
                  <CardDescription>Ingresa el código de 6 dígitos del cliente para confirmar su pedido.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                  <Input
                      placeholder="123456"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <Button onClick={handleVerifyCode}>Confirmar</Button>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Crear Pedido Manual</CardTitle>
                  <CardDescription>Registra un pedido para clientes en el punto físico.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button className="w-full" onClick={() => setIsManualOrderFormOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Nuevo Pedido
                  </Button>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Exportar Ventas</CardTitle>
                  <CardDescription>Descarga un archivo Excel con el historial de todos los pedidos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button className="w-full" variant="outline" onClick={handleExport}>
                      <File className="mr-2 h-4 w-4" />
                      Exportar a Excel
                  </Button>
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestionar Productos</CardTitle>
                <CardDescription>Administra los productos disponibles en la sala de espera.</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Añadir Producto
                  </span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead className="hidden w-[100px] sm:table-cell">Imagen</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {products.map((product) => (
                      <TableRow key={product.id}>
                      <TableCell className="hidden sm:table-cell">
                          <Image
                          alt={product.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={product.imageUrl}
                          width="64"
                          />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                          <Badge variant={product.stock > product.stockMin ? "secondary" : "destructive"}>
                              {product.stock} en stock
                          </Badge>
                      </TableCell>
                      <TableCell>COP {product.price.toLocaleString('es-CO')}</TableCell>
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  ))}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AddWaitingRoomProductForm 
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onAddProduct={handleAddProduct}
      />
      <OrderDetailsDialog 
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        order={selectedOrder}
      />
      <ManualOrderForm
        isOpen={isManualOrderFormOpen}
        onOpenChange={setIsManualOrderFormOpen}
        products={products}
        onAddOrder={handleAddManualOrder}
      />
    </div>
  );
}