"use client";
import React, { useState } from 'react';
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
import { dummySavedObjects } from "../data";
import type { SavedObject } from '@/lib/types';
import { AddSavedObjectForm } from '@/components/dashboard/AddSavedObjectForm';

export default function SavedObjectsPage() {
  const [savedObjects, setSavedObjects] = useState<SavedObject[]>(dummySavedObjects);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddObject = (newObject: Omit<SavedObject, 'id' | 'dateStored' | 'dateReturned' | 'status'>) => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    const objectWithId = { 
        ...newObject, 
        id: `OBJ${savedObjects.length + 1}`,
        dateStored: formattedDate,
        dateReturned: null,
        status: 'Guardado' as const,
    };
    const updatedObjects = [...savedObjects, objectWithId];
    setSavedObjects(updatedObjects);
    dummySavedObjects.push(objectWithId);
    setIsFormOpen(false);
  };
  
  const handleMarkAsReturned = (objectId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedObjects = savedObjects.map(obj => 
      obj.id === objectId 
        ? { ...obj, status: 'Devuelto' as const, dateReturned: today }
        : obj
    );
    setSavedObjects(updatedObjects);

    const dummyIndex = dummySavedObjects.findIndex(obj => obj.id === objectId);
    if (dummyIndex !== -1) {
      dummySavedObjects[dummyIndex].status = 'Devuelto';
      dummySavedObjects[dummyIndex].dateReturned = today;
    }
  };

  const handleDeleteObject = (objectId: string) => {
    const updatedObjects = savedObjects.filter(obj => obj.id !== objectId);
    setSavedObjects(updatedObjects);

    const dummyIndex = dummySavedObjects.findIndex(obj => obj.id === objectId);
    if (dummyIndex !== -1) {
      dummySavedObjects.splice(dummyIndex, 1);
    }
  };


  return (
    <>
      <PageHeader title="Guardar Objetos">
        <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Objeto
          </span>
        </Button>
      </PageHeader>

      <AddSavedObjectForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onAddObject={handleAddObject}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Objeto</TableHead>
            <TableHead>Fecha de Entrega</TableHead>
            <TableHead>Fecha de Devolución</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {savedObjects.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.customerName}</TableCell>
              <TableCell>{item.objectName}</TableCell>
              <TableCell>{item.dateStored}</TableCell>
              <TableCell>{item.dateReturned || 'N/A'}</TableCell>
              <TableCell>
                <Badge 
                  variant={
                    item.status === 'Guardado' ? 'secondary' : 'default'
                  }
                  className={item.status === 'Guardado' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40' : ''}
                >
                  {item.status}
                </Badge>
              </TableCell>
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
                    <DropdownMenuItem 
                        onClick={() => handleMarkAsReturned(item.id)}
                        disabled={item.status === 'Devuelto'}
                    >
                        Marcar como Devuelto
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onClick={() => handleDeleteObject(item.id)}
                        className="text-destructive"
                    >
                        Eliminar
                    </DropdownMenuItem>
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
