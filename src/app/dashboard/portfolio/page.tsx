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
import { dummyPortfolioItems } from "../data";
import type { PortfolioItem } from '@/lib/types';
import { AddPortfolioItemForm } from '@/components/dashboard/AddPortfolioItemForm';

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(dummyPortfolioItems);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddPortfolioItem = (newItem: Omit<PortfolioItem, 'id'>) => {
    const itemWithId = { ...newItem, id: `PORT${portfolioItems.length + 1}` };
    const updatedItems = [...portfolioItems, itemWithId];
    setPortfolioItems(updatedItems);
    dummyPortfolioItems.push(itemWithId);
    setIsFormOpen(false);
  };

  return (
    <>
      <PageHeader title="Portafolio">
        <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Trabajo
          </span>
        </Button>
      </PageHeader>

      <AddPortfolioItemForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onAddPortfolioItem={handleAddPortfolioItem}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Imagen</span>
            </TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolioItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="hidden sm:table-cell">
                <Image
                  alt={item.description}
                  className="aspect-square rounded-md object-cover"
                  height="64"
                  src={item.imageUrl}
                  width="64"
                />
              </TableCell>
              <TableCell className="font-medium">{item.description}</TableCell>
              <TableCell>{item.category}</TableCell>
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
    </>
  );
}
