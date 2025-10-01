"use client";
import React, { useState } from 'react';
import Image from "next/image";
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
import { dummyProducts } from "../data";
import type { Product } from '@/lib/types';
import { AddProductForm } from '@/components/dashboard/AddProductForm';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(dummyProducts);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenForm = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSaveProduct = (productData: Omit<Product, 'id'> | Product) => {
    if ('id' in productData) {
      // Editing existing product
      const updatedProducts = products.map(p => p.id === productData.id ? { ...p, ...productData } : p);
      setProducts(updatedProducts);
      const dummyIndex = dummyProducts.findIndex(p => p.id === productData.id);
      if (dummyIndex !== -1) {
          dummyProducts[dummyIndex] = { ...dummyProducts[dummyIndex], ...productData };
      }
    } else {
      // Adding new product
      const newProduct = { ...productData, id: `PRD${products.length + 1}` };
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      dummyProducts.push(newProduct);
    }
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    const dummyIndex = dummyProducts.findIndex(p => p.id === productId);
    if (dummyIndex !== -1) {
      dummyProducts.splice(dummyIndex, 1);
    }
  };

  return (
    <>
      <PageHeader title="Productos">
        <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Producto
          </span>
        </Button>
      </PageHeader>

      <AddProductForm 
        isOpen={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setEditingProduct(null);
        }}
        onSaveProduct={handleSaveProduct}
        existingProduct={editingProduct}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Imagen</span>
            </TableHead>
            <TableHead>Nombre</TableHead>
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
                    <DropdownMenuItem onClick={() => handleOpenForm(product)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)}>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
