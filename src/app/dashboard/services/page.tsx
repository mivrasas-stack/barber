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
import { dummyServices } from "../data";
import { AddServiceForm } from '@/components/dashboard/AddServiceForm';
import type { Service } from '@/lib/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>(dummyServices);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddService = (newService: Omit<Service, 'id'>) => {
    const serviceWithId = { ...newService, id: `SRV${services.length + 1}` };
    const updatedServices = [...services, serviceWithId];
    setServices(updatedServices);
    // This is a temporary solution to update the data for the landing page.
    // In a real application, this data would be fetched from a database.
    // We are modifying the "dummyServices" array directly.
    dummyServices.push(serviceWithId);
    setIsFormOpen(false);
  };

  return (
    <>
      <PageHeader title="Servicios">
        <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Añadir Servicio
          </span>
        </Button>
      </PageHeader>
      
      <AddServiceForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onAddService={handleAddService}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>COP {service.price.toLocaleString('es-CO')}</TableCell>
              <TableCell>{service.duration} min</TableCell>
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
