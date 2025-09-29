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
import { dummyWaitingRoomProducts } from "../data";
import type { WaitingRoomProduct } from '@/lib/types';
import { AddWaitingRoomProductForm } from '@/components/dashboard/AddWaitingRoomProductForm';

export default function WaitingRoomPage() {
  const [products, setProducts] = useState<WaitingRoomProduct[]>(dummyWaitingRoomProducts);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddProduct = (newProduct: Omit<WaitingRoomProduct, 'id'>) => {
    const productWithId = { ...newProduct, id: `WR${products.length + 1}` };
    const updatedProducts = [...products, productWithId];
    setProducts(updatedProducts);
    dummyWaitingRoomProducts.push(productWithId);
    setIsFormOpen(false);
  };

  return (
    <>
      <PageHeader title="Sala de Espera" />
      <Tabs defaultValue="manage-products">
        <TabsList>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="manage-products">Gestionar Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6">
            <p>Aquí se mostrarán los pedidos de la sala de espera.</p>
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
