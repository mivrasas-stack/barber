"use client";
import React, { useState } from 'react';
import Image from "next/image";
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
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { dummyWaitingRoomProducts, dummyWaitingRoomOrders } from "../data";
import type { WaitingRoomProduct, WaitingRoomOrder } from '@/lib/types';
import { AddWaitingRoomProductForm } from '@/components/dashboard/AddWaitingRoomProductForm';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";

export default function WaitingRoomPage() {
  const [products, setProducts] = useState<WaitingRoomProduct[]>(dummyWaitingRoomProducts);
  const [orders, setOrders] = useState<WaitingRoomOrder[]>(dummyWaitingRoomOrders);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
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

  return (
    <>
      <PageHeader title="Sala de Espera" />
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="manage-products">Gestionar Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6 grid gap-6 md:grid-cols-2">
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
                    <Button onClick={handleVerifyCode}>Confirmar Pedido</Button>
                </CardContent>
            </Card>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Pedidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.customerName}</TableCell>
                                    <TableCell>{order.code}</TableCell>
                                    <TableCell>COP {order.total.toLocaleString('es-CO')}</TableCell>
                                    <TableCell>
                                    <Badge 
                                        variant={order.status === 'Confirmado' ? 'secondary' : 'outline'}
                                        className={order.status === 'Confirmado' ? 'bg-green-600/20 text-green-400 border-green-600/40' : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40'}
                                    >
                                        {order.status}
                                    </Badge>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="manage-products" className="mt-6">
            <div className="flex justify-end mb-4">
                <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Añadir Producto
                    </span>
                </Button>
            </div>
            
            <AddWaitingRoomProductForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onAddProduct={handleAddProduct}
            />

            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                        <span className="sr-only">Imagen</span>
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>
                    <span className="sr-only">Acciones</span>
                    </TableHead>
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
        </TabsContent>
      </Tabs>
    </>
  );
}
